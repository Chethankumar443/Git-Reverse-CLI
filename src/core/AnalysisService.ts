// ─────────────────────────────────────────────────────────────
//  git-reverse — Analysis Service
//  Orchestrates: GitHub fetch / Local dir scan → Prompt build → LLM stream
// ─────────────────────────────────────────────────────────────

import { GitHubClient } from '../api/GitHubClient.js';
import { OpenRouterClient } from '../api/OpenRouterClient.js';
import { PromptBuilder } from './PromptBuilder.js';
import { getCachedModels } from '../config/store.js';
import type { AnalysisInput, RepoAnalysis, StreamChunk, Message } from '../types/index.js';
import { isLocalPath } from '../utils/github.js';

export type AnalysisPhase =
  | 'idle'
  | 'parsing-url'
  | 'scanning-local'
  | 'fetching-meta'
  | 'fetching-tree'
  | 'fetching-files'
  | 'building-prompt'
  | 'streaming'
  | 'done'
  | 'error';

export interface AnalysisProgress {
  phase: AnalysisPhase;
  message: string;
  repoMeta?: RepoAnalysis['meta'];
  messages?: Message[];
}

export class AnalysisService {
  private githubClient: GitHubClient;
  private openrouterClient: OpenRouterClient;

  constructor(apiKey: string, githubToken?: string) {
    this.githubClient = new GitHubClient(githubToken);
    this.openrouterClient = new OpenRouterClient(apiKey);
  }

  async *analyze(
    input: AnalysisInput,
    onProgress: (progress: AnalysisProgress) => void,
  ): AsyncGenerator<StreamChunk> {
    const { repoUrl, query, mode, model } = input;

    // ── Branch: general chatbot (Explore/General mode without repo) ──
    if (repoUrl === 'chat') {
      onProgress({ phase: 'building-prompt', message: 'Connecting to OpenRouter...' });
      const messages: Message[] = [
        {
          role: 'system',
          content: 'You are git-reverse, an expert software assistant. Help the user with their programming question.',
        },
        {
          role: 'user',
          content: query || 'Hello',
        },
      ];
      onProgress({
        phase: 'streaming',
        message: `Chatting with ${model.split('/').pop()}...`,
      });
      yield* this.openrouterClient.streamCompletion(model, messages, {
        maxTokens: 4096,
        temperature: 0.5,
      });
      onProgress({ phase: 'done', message: 'Chat complete.', messages });
      return;
    }

    let analysis: RepoAnalysis;

    // ── Branch: local directory ──────────────────────────────
    if (isLocalPath(repoUrl)) {
      onProgress({ phase: 'scanning-local', message: `Scanning local directory: ${repoUrl}` });

      try {
        analysis = await GitHubClient.analyzeLocalDir(repoUrl, (phase, detail) => {
          if (phase === 'fetching-tree') {
            onProgress({ phase: 'fetching-tree', message: 'Mapping local file tree...' });
          } else if (phase === 'fetching-files') {
            onProgress({ phase: 'fetching-files', message: 'Reading key files...' });
          }
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to scan local directory "${repoUrl}":\n${msg}`);
      }

    // ── Branch: GitHub URL ───────────────────────────────────
    } else {
      onProgress({ phase: 'parsing-url', message: 'Parsing repository URL...' });
      const parsed = GitHubClient.parseUrl(repoUrl);
      if (!parsed) {
        throw new Error(
          `Could not parse GitHub URL: "${repoUrl}"\n` +
            'Expected: https://github.com/owner/repo  or a local path like . or ./my-project',
        );
      }

      onProgress({
        phase: 'fetching-meta',
        message: `Fetching ${parsed.owner}/${parsed.repo} metadata...`,
      });

      try {
        const meta = await this.githubClient.fetchRepoMeta(parsed.owner, parsed.repo);

        onProgress({
          phase: 'fetching-tree',
          message: `Mapping file tree (${meta.defaultBranch})...`,
          repoMeta: meta,
        });

        const branch = parsed.branch ?? meta.defaultBranch;
        const tree = await this.githubClient.fetchRepoTree(parsed.owner, parsed.repo, branch);

        onProgress({
          phase: 'fetching-files',
          message: `Reading ${Math.min(tree.filter((f) => f.type === 'file').length, 12)} key files...`,
          repoMeta: meta,
        });

        const keyFiles = await this.githubClient.fetchKeyFiles(
          parsed.owner,
          parsed.repo,
          branch,
          tree,
          (fetched, total) => {
            onProgress({
              phase: 'fetching-files',
              message: `Reading key files (${fetched}/${total})...`,
              repoMeta: meta,
            });
          },
        );

        const stack = GitHubClient.detectStack(tree, keyFiles);
        const dependencies = GitHubClient.parseDependencies(keyFiles);
        analysis = { meta, tree, keyFiles, stack, dependencies };

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('404')) {
          throw new Error(
            `Repository not found: ${GitHubClient.parseUrl(repoUrl)?.owner}/${GitHubClient.parseUrl(repoUrl)?.repo}\n` +
              'Check the URL and ensure the repository is public (or provide a GitHub token for private repos).',
          );
        }
        if (msg.includes('403') || msg.includes('rate limit') || msg.includes('secondary')) {
          throw new Error(
            'GitHub API rate limit reached.\n' +
              'Tip: Add a GitHub token in Settings (\\settings) for 5,000 req/hr instead of 60.',
          );
        }
        throw err;
      }
    }

    // ── Build prompt ─────────────────────────────────────────
    onProgress({
      phase: 'building-prompt',
      message: 'Building analysis prompt...',
      repoMeta: analysis.meta,
    });

    const messages: Message[] = PromptBuilder.buildMessages(analysis, mode, query);

    // Check token limits
    const estimatedTokens = PromptBuilder.estimateTokens(messages);
    const cached = getCachedModels();
    const modelData = cached.models.find((m) => m.id === model);
    const contextLimit = modelData?.context_length ?? 8192;

    if (estimatedTokens > contextLimit * 0.9) {
      throw new Error(
        `⚠️  Repository is too large for this model (${estimatedTokens.toLocaleString()} / ${contextLimit.toLocaleString()} tokens).\n` +
          'Try a 100k+ context model, or use \\compact mode to reduce the prompt size.',
      );
    }

    // ── Stream LLM response ──────────────────────────────────
    onProgress({
      phase: 'streaming',
      message: `Analyzing with ${model.split('/').pop()}...`,
      repoMeta: analysis.meta,
    });

    yield* this.openrouterClient.streamCompletion(model, messages, {
      maxTokens: mode === 'deep' ? 8192 : 4096,
      temperature: mode === 'deep' ? 0.4 : 0.3,
    });

    onProgress({ phase: 'done', message: 'Analysis complete.', repoMeta: analysis.meta, messages });
  }

  // ── Summarize existing session ────────────────────────────

  async *summarizeSession(
    messages: Message[],
    model: string,
  ): AsyncGenerator<StreamChunk> {
    const summarizeMsg = PromptBuilder.buildSummarizePrompt(messages);
    yield* this.openrouterClient.streamCompletion(model, [summarizeMsg], {
      maxTokens: 1024,
      temperature: 0.2,
    });
  }

  // ── Static helper for repo meta display ──────────────────

  static formatRepoStats(meta: RepoAnalysis['meta']): string {
    if (meta.owner === 'local') {
      return `local:${meta.repo}`;
    }
    return `${meta.owner}/${meta.repo} · ${meta.language} · ★ ${meta.stars.toLocaleString()}`;
  }
}
