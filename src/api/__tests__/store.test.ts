// ─────────────────────────────────────────────────────────────
//  git-reverse — Config Store Tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMergedUserConfig, getUser } from '../../config/store.js';
import { existsSync, readFileSync } from 'node:fs';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

describe('Config Store Merging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns global user config when no local file exists', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const merged = getMergedUserConfig();
    const global = getUser();

    expect(merged.selectedModel).toBe(global.selectedModel);
    expect(merged.githubToken).toBe(global.githubToken);
  });

  it('merges selectedModel from .gitreverse when it exists', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (typeof path === 'string' && path.endsWith('.gitreverse')) return true;
      return false;
    });

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ selectedModel: 'meta-llama/llama-3' })
    );

    const merged = getMergedUserConfig();
    expect(merged.selectedModel).toBe('meta-llama/llama-3');
  });

  it('merges githubToken from .gitreverse.json when it exists', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (typeof path === 'string' && path.endsWith('.gitreverse.json')) return true;
      return false;
    });

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ githubToken: 'local-token-xyz' })
    );

    const merged = getMergedUserConfig();
    expect(merged.githubToken).toBe('local-token-xyz');
  });
});
