// ─────────────────────────────────────────────────────────────
//  git-reverse — GitHub URL Utilities
// ─────────────────────────────────────────────────────────────

import type { GitHubUrlParsed } from '../types/index.js';

export function parseGitHubInput(input: string): {
  parsed: GitHubUrlParsed | null;
  query: string;
} {
  const trimmed = input.trim();

  // Find the GitHub URL within potentially mixed text
  const urlMatch = trimmed.match(/(https?:\/\/github\.com\/[^\s]+)/);
  if (!urlMatch) {
    return { parsed: null, query: trimmed };
  }

  const urlStr = urlMatch[1]!;
  const urlIndex = trimmed.indexOf(urlStr);
  const before = trimmed.slice(0, urlIndex).trim();
  const after = trimmed.slice(urlIndex + urlStr.length).trim();
  const query = [before, after].filter(Boolean).join(' ');

  const urlPattern = /github\.com\/([^/\s]+)\/([^/\s?#]+)(?:\/tree\/([^/\s?#]+))?/;
  const match = urlStr.match(urlPattern);

  if (!match) return { parsed: null, query };

  return {
    parsed: {
      owner: match[1]!,
      repo: match[2]!.replace(/\.git$/, ''),
      branch: match[3],
      raw: urlStr,
    },
    query,
  };
}

export function isGitHubUrl(str: string): boolean {
  return /github\.com\/[^/\s]+\/[^/\s]+/.test(str);
}

export function buildRepoUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}

export function isLocalPath(input: string): boolean {
  const trimmed = input.trim();
  return (
    trimmed === '.' ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('/') ||
    /^[A-Za-z]:[/\\]/.test(trimmed)
  );
}
