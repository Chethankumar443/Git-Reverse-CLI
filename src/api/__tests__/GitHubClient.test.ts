// ─────────────────────────────────────────────────────────────
//  git-reverse — GitHubClient Tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { GitHubClient } from '../GitHubClient.js';

describe('GitHubClient.parseUrl', () => {
  it('parses a standard repo URL', () => {
    const result = GitHubClient.parseUrl('https://github.com/sindresorhus/ora');
    expect(result).toMatchObject({ owner: 'sindresorhus', repo: 'ora' });
  });

  it('parses URL with .git suffix', () => {
    const result = GitHubClient.parseUrl('https://github.com/owner/my-repo.git');
    expect(result?.repo).toBe('my-repo');
  });

  it('parses URL with branch', () => {
    const result = GitHubClient.parseUrl('https://github.com/vercel/next.js/tree/canary');
    expect(result).toMatchObject({ owner: 'vercel', repo: 'next.js', branch: 'canary' });
  });

  it('parses URL embedded in text', () => {
    const result = GitHubClient.parseUrl('https://github.com/vitejs/vite  how does the plugin system work?');
    expect(result?.owner).toBe('vitejs');
    expect(result?.repo).toBe('vite');
  });

  it('returns null for non-GitHub URLs', () => {
    expect(GitHubClient.parseUrl('https://gitlab.com/owner/repo')).toBeNull();
    expect(GitHubClient.parseUrl('not-a-url')).toBeNull();
  });
});

describe('GitHubClient.detectStack', () => {
  const tree = [
    { path: 'README.md', type: 'file' as const, sha: 'abc' },
    { path: 'package.json', type: 'file' as const, sha: 'def' },
    { path: 'src/index.ts', type: 'file' as const, sha: 'ghi' },
    { path: 'tsconfig.json', type: 'file' as const, sha: 'jkl' },
    { path: 'vite.config.ts', type: 'file' as const, sha: 'stu' },
  ];
  const keyFiles: Array<{ path: string; content: string; role: 'readme' | 'package' }> = [
    { path: 'package.json', content: '{"dependencies":{"express":"^4"}}', role: 'package' },
  ];

  it('detects TypeScript', () => {
    const stack = GitHubClient.detectStack(tree, keyFiles as any);
    expect(stack).toContain('TypeScript');
  });

  it('detects Vite', () => {
    const stack = GitHubClient.detectStack(tree, keyFiles as any);
    expect(stack).toContain('Vite');
  });

  it('detects Express from package content', () => {
    const stack = GitHubClient.detectStack(tree, keyFiles as any);
    expect(stack).toContain('Express');
  });

  it('does not include duplicates', () => {
    const stack = GitHubClient.detectStack(tree, keyFiles as any);
    expect(new Set(stack).size).toBe(stack.length);
  });
});
