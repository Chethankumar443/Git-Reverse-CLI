// ─────────────────────────────────────────────────────────────
//  git-reverse — GitHub API Client
//  Handles: repo metadata, file tree, key file content
//  Includes: throttling, retry, and local directory scanning
// ─────────────────────────────────────────────────────────────

import { Octokit as CoreOctokit } from '@octokit/core';
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';
import type {
  GitHubUrlParsed,
  RepoMeta,
  RepoFile,
  KeyFile,
  RepoAnalysis,
  DependencyMap,
} from '../types/index.js';

// Build a fully-featured Octokit with throttling and retry on top of core
// (avoids the @octokit/rest vs @octokit/core version-type mismatch)
const MyOctokit = CoreOctokit.plugin(restEndpointMethods, throttling, retry);

// Key files to always fetch (in priority order)
const KEY_FILE_PATTERNS: Array<{ pattern: RegExp; role: KeyFile['role'] }> = [
  { pattern: /^README(\.(md|txt|rst))?$/i, role: 'readme' },
  { pattern: /^package\.json$/, role: 'package' },
  { pattern: /^pyproject\.toml$/, role: 'package' },
  { pattern: /^Cargo\.toml$/, role: 'package' },
  { pattern: /^go\.mod$/, role: 'package' },
  { pattern: /^pom\.xml$/, role: 'package' },
  { pattern: /^build\.gradle(\.kts)?$/, role: 'package' },
  { pattern: /^Gemfile$/, role: 'package' },
  { pattern: /^requirements\.txt$/, role: 'package' },
  { pattern: /^tsconfig\.json$/, role: 'config' },
  { pattern: /^\.eslintrc(\.(js|json|yml|yaml))?$/, role: 'config' },
  { pattern: /^eslint\.config\.(js|ts|mjs)$/, role: 'config' },
  { pattern: /^vite\.config\.(js|ts)$/, role: 'config' },
  { pattern: /^webpack\.config\.(js|ts)$/, role: 'config' },
  { pattern: /^next\.config\.(js|ts|mjs)$/, role: 'config' },
  { pattern: /^docker-compose\.(yml|yaml)$/, role: 'config' },
  { pattern: /^Dockerfile$/, role: 'config' },
  { pattern: /^\.env\.example$/, role: 'config' },
  { pattern: /^main\.(ts|js|py|go|rs|rb)$/, role: 'entrypoint' },
  { pattern: /^index\.(ts|js|tsx|jsx)$/, role: 'entrypoint' },
  { pattern: /^app\.(ts|js|tsx|jsx|py)$/, role: 'entrypoint' },
  { pattern: /^server\.(ts|js|py)$/, role: 'entrypoint' },
  { pattern: /^schema\.(prisma|graphql|sql)$/, role: 'schema' },
  { pattern: /^models?\.(ts|js|py)$/, role: 'schema' },
];

const MAX_FILE_SIZE_BYTES = 80_000; // 80KB per file
const MAX_KEY_FILES = 12;
const MAX_TREE_DEPTH = 4;

export class GitHubClient {
  private octokit: InstanceType<typeof MyOctokit>;

  constructor(githubToken?: string) {
    this.octokit = new MyOctokit({
      auth: githubToken || undefined,
      userAgent: 'git-reverse/1.0.0',
      throttle: {
        onRateLimit: (retryAfter: number, options: { method: string; url: string }, octokit: typeof CoreOctokit.prototype, retryCount: number) => {
          octokit.log.warn(`Rate limit hit for ${options.method} ${options.url} — retrying after ${retryAfter}s (attempt ${retryCount + 1})`);
          return retryCount < 3; // retry up to 3 times
        },
        onSecondaryRateLimit: (retryAfter: number, options: { method: string; url: string }, octokit: typeof CoreOctokit.prototype) => {
          octokit.log.warn(`Secondary rate limit hit for ${options.method} ${options.url} — retrying after ${retryAfter}s`);
          return true; // always retry secondary limits
        },
      },
    });
  }

  // ── GitHub Token Validation ───────────────────────────────

  static async validateGithubToken(token: string): Promise<{ valid: boolean; login?: string; scopes?: string; error?: string }> {
    try {
      const testOctokit = new (CoreOctokit.plugin(restEndpointMethods))({ auth: token });
      const { data, headers } = await testOctokit.rest.users.getAuthenticated();
      return {
        valid: true,
        login: data.login,
        scopes: (headers as Record<string, string>)['x-oauth-scopes'] ?? 'unknown',
      };
    } catch (err: unknown) {
      if (err instanceof Error && 'status' in err) {
        const status = (err as { status: number }).status;
        if (status === 401) return { valid: false, error: 'Invalid token — check the token and try again.' };
        if (status === 403) return { valid: false, error: 'Token forbidden — check its permissions.' };
      }
      return { valid: false, error: err instanceof Error ? err.message : 'Validation failed.' };
    }
  }

  // ── URL Parsing ───────────────────────────────────────────

  static parseUrl(url: string): GitHubUrlParsed | null {
    // Strip query and trailing query text — handle "https://github.com/owner/repo some query"
    const parts = url.trim().split(/\s+/);
    const rawUrl = parts[0] ?? '';

    const patterns = [
      /github\.com\/([^/]+)\/([^/?\s]+)(?:\/tree\/([^/?\s]+))?(?:\/(.+))?/,
    ];

    for (const pattern of patterns) {
      const match = rawUrl.match(pattern);
      if (match) {
        return {
          owner: match[1]!,
          repo: match[2]!.replace(/\.git$/, ''),
          branch: match[3],
          subPath: match[4],
          raw: rawUrl,
        };
      }
    }
    return null;
  }

  // ── Repo Metadata ─────────────────────────────────────────

  async fetchRepoMeta(owner: string, repo: string): Promise<RepoMeta> {
    const { data } = await this.octokit.rest.repos.get({ owner, repo });

    return {
      owner,
      repo,
      description: data.description ?? '',
      stars: data.stargazers_count,
      language: data.language ?? 'Unknown',
      topics: data.topics ?? [],
      defaultBranch: data.default_branch,
      license: data.license?.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      openIssues: data.open_issues_count,
      forks: data.forks_count,
      size: data.size,
    };
  }

  // ── File Tree ─────────────────────────────────────────────

  async fetchRepoTree(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<RepoFile[]> {
    try {
      const { data } = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: '1',
      });

      const { default: ignore } = await import('ignore');
      const ig = ignore().add([
        'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
        '.venv', 'vendor', 'target', 'package-lock.json', 'yarn.lock',
        'pnpm-lock.yaml', '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico',
        '*.mp4', '*.mp3', '*.pdf', '*.zip', '*.tar.gz', '.idea', '.vscode'
      ]);

      return (data.tree ?? [])
        .filter((item) => item.path && item.type)
        .filter((item) => {
          const depth = (item.path ?? '').split('/').length;
          return depth <= MAX_TREE_DEPTH && !ig.ignores(item.path!);
        })
        .map((item) => ({
          path: item.path!,
          type: item.type === 'tree' ? 'dir' : 'file',
          size: item.size,
          sha: item.sha!,
        }));
    } catch {
      // Fallback: use contents API for root
      const { data } = await this.octokit.rest.repos.getContent({ owner, repo, path: '' });
      if (!Array.isArray(data)) return [];

      const { default: ignore } = await import('ignore');
      const ig = ignore().add(['node_modules', '.git', 'dist', 'build', 'package-lock.json', '*.png']);

      return data
        .filter(item => !ig.ignores(item.path))
        .map((item) => ({
          path: item.path,
          type: item.type === 'dir' ? 'dir' : 'file',
          size: 'size' in item ? item.size : undefined,
          sha: item.sha,
        }));
    }
  }

  // ── Fetch Key Files ───────────────────────────────────────

  async fetchKeyFiles(
    owner: string,
    repo: string,
    branch: string,
    tree: RepoFile[],
    onProgress?: (fetched: number, total: number) => void,
  ): Promise<KeyFile[]> {
    const keyFiles: Array<{ path: string; role: KeyFile['role'] }> = [];

    for (const file of tree) {
      if (file.type !== 'file') continue;
      const filename = file.path.split('/').pop() ?? '';
      for (const { pattern, role } of KEY_FILE_PATTERNS) {
        if (pattern.test(filename)) {
          keyFiles.push({ path: file.path, role });
          break;
        }
      }
      if (keyFiles.length >= MAX_KEY_FILES) break;
    }

    const results: KeyFile[] = [];
    for (let i = 0; i < keyFiles.length; i++) {
      const { path, role } = keyFiles[i]!;
      onProgress?.(i, keyFiles.length);
      try {
        const { data } = await this.octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
        if ('content' in data && typeof data.content === 'string') {
          const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
          if (decoded.length <= MAX_FILE_SIZE_BYTES) {
            results.push({ path, content: decoded, role, size: decoded.length });
          }
        }
      } catch {
        // Skip files that can't be fetched
      }
    }

    return results;
  }

  // ── Detect Tech Stack ─────────────────────────────────────

  static detectStack(files: RepoFile[], keyFiles: KeyFile[]): string[] {
    const stack: string[] = [];
    const paths = files.map((f) => f.path);
    const allContent = keyFiles.map((f) => f.content).join('\n');

    if (paths.some((p) => p.endsWith('.ts') || p.endsWith('.tsx'))) stack.push('TypeScript');
    if (paths.some((p) => p.endsWith('.py'))) stack.push('Python');
    if (paths.some((p) => p.endsWith('.go'))) stack.push('Go');
    if (paths.some((p) => p.endsWith('.rs'))) stack.push('Rust');
    if (paths.some((p) => p.endsWith('.java'))) stack.push('Java');
    if (paths.some((p) => p.endsWith('.rb'))) stack.push('Ruby');
    if (paths.some((p) => p.endsWith('.php'))) stack.push('PHP');
    if (paths.some((p) => p.endsWith('.cs'))) stack.push('C#');

    if (paths.some((p) => p.includes('next.config'))) stack.push('Next.js');
    else if (paths.some((p) => p.includes('vite.config'))) stack.push('Vite');
    else if (paths.some((p) => p.includes('react'))) stack.push('React');

    if (paths.some((p) => p.includes('tailwind'))) stack.push('TailwindCSS');
    if (paths.some((p) => p.match(/prisma|schema\.prisma/))) stack.push('Prisma');
    if (paths.some((p) => p.includes('docker'))) stack.push('Docker');
    if (allContent.includes('"express"')) stack.push('Express');
    if (allContent.includes('"fastapi"') || allContent.includes('fastapi')) stack.push('FastAPI');

    return [...new Set(stack)];
  }

  // ── Parse Dependencies ────────────────────────────────────

  static parseDependencies(keyFiles: KeyFile[]): DependencyMap {
    const deps: DependencyMap = {};
    for (const file of keyFiles) {
      if (file.role !== 'package') continue;
      if (file.path.endsWith('package.json')) {
        try {
          const pkg = JSON.parse(file.content);
          Object.assign(deps, pkg.dependencies ?? {}, pkg.devDependencies ?? {});
        } catch { /* ignore */ }
      }
    }
    return deps;
  }

  // ── Full Analysis ─────────────────────────────────────────

  async analyzeRepo(
    parsed: GitHubUrlParsed,
    onProgress: (phase: string, detail?: string) => void,
  ): Promise<RepoAnalysis> {
    const { owner, repo } = parsed;

    onProgress('fetching-meta');
    const meta = await this.fetchRepoMeta(owner, repo);

    const branch = parsed.branch ?? meta.defaultBranch;

    onProgress('fetching-tree');
    const tree = await this.fetchRepoTree(owner, repo, branch);

    onProgress('fetching-files', `0/${Math.min(tree.length, MAX_KEY_FILES)}`);
    const keyFiles = await this.fetchKeyFiles(owner, repo, branch, tree, (fetched, total) => {
      onProgress('fetching-files', `${fetched}/${total}`);
    });

    const stack = GitHubClient.detectStack(tree, keyFiles);
    const dependencies = GitHubClient.parseDependencies(keyFiles);

    return { meta, tree, keyFiles, stack, dependencies };
  }

  // ── Local Directory Analysis ──────────────────────────────

  static async analyzeLocalDir(
    dirPath: string,
    onProgress: (phase: string, detail?: string) => void,
  ): Promise<RepoAnalysis> {
    const { default: glob } = await import('fast-glob');
    const { readFileSync, statSync } = await import('fs');
    const { resolve, relative, basename } = await import('path');
    const { default: ignore } = await import('ignore');

    const absDir = resolve(dirPath);
    const dirName = basename(absDir);

    // Read .gitignore if it exists
    const ig = ignore().add([
      'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
      '.venv', 'vendor', 'target', 'package-lock.json', 'yarn.lock',
      'pnpm-lock.yaml', '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico',
      '*.mp4', '*.mp3', '*.pdf', '*.zip', '*.tar.gz', '.idea', '.vscode',
    ]);

    try {
      const gitignoreContent = readFileSync(`${absDir}/.gitignore`, 'utf-8');
      ig.add(gitignoreContent);
    } catch { /* no .gitignore, that's ok */ }

    onProgress('fetching-tree');

    const allPaths = await glob('**/*', {
      cwd: absDir,
      dot: true,
      onlyFiles: false,
      followSymbolicLinks: false,
      deep: MAX_TREE_DEPTH,
    });

    const tree: RepoFile[] = allPaths
      .filter(p => !ig.ignores(p))
      .map(p => {
        const abs = `${absDir}/${p}`;
        let isDir = false;
        try { isDir = statSync(abs).isDirectory(); } catch { /* ignore */ }
        return {
          path: p,
          type: (isDir ? 'dir' : 'file') as 'dir' | 'file',
          size: isDir ? undefined : ((): number | undefined => {
            try { return statSync(abs).size; } catch { return undefined; }
          })(),
          sha: '',
        };
      });

    onProgress('fetching-files');

    const keyFiles: KeyFile[] = [];
    for (const file of tree) {
      if (file.type !== 'file') continue;
      const filename = file.path.split('/').pop() ?? '';
      for (const { pattern, role } of KEY_FILE_PATTERNS) {
        if (pattern.test(filename)) {
          try {
            const content = readFileSync(`${absDir}/${file.path}`, 'utf-8');
            if (content.length <= MAX_FILE_SIZE_BYTES) {
              keyFiles.push({ path: file.path, content, role, size: content.length });
            }
          } catch { /* skip unreadable files */ }
          break;
        }
      }
      if (keyFiles.length >= MAX_KEY_FILES) break;
    }

    const meta: RepoMeta = {
      owner: 'local',
      repo: dirName,
      description: `Local project at ${absDir}`,
      stars: 0,
      language: 'Unknown',
      topics: [],
      defaultBranch: 'local',
      size: 0,
    };

    const stack = GitHubClient.detectStack(tree, keyFiles);
    const dependencies = GitHubClient.parseDependencies(keyFiles);

    return { meta, tree, keyFiles, stack, dependencies };
  }
}
