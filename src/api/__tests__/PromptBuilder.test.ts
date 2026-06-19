// ─────────────────────────────────────────────────────────────
//  git-reverse — PromptBuilder Tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { PromptBuilder } from '../../core/PromptBuilder.js';
import type { RepoAnalysis } from '../../types/index.js';

const mockAnalysis: RepoAnalysis = {
  meta: {
    owner: 'sindresorhus',
    repo: 'ora',
    description: 'Elegant terminal spinner',
    stars: 9000,
    forks: 300,
    language: 'JavaScript',
    topics: ['cli', 'spinner', 'terminal'],
    defaultBranch: 'main',
    size: 200,
    createdAt: '2015-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  tree: [
    { path: 'index.js', type: 'file', sha: 'abc' },
    { path: 'readme.md', type: 'file', sha: 'def' },
  ],
  keyFiles: [
    {
      path: 'readme.md',
      content: '# ora\nElegant terminal spinner for Node.js',
      role: 'readme',
    },
  ],
  dependencies: { 'chalk': '^5.0.0', 'xo': '^0.56.0' },
  stack: ['JavaScript', 'Ink (CLI)'],
};

describe('PromptBuilder', () => {
  describe('buildSystemPrompt', () => {
    it('returns a system role message', () => {
      const msg = PromptBuilder.buildSystemPrompt();
      expect(msg.role).toBe('system');
      expect(msg.content).toContain('git-reverse');
      expect(msg.content).toContain('Recreation Steps');
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('includes repo metadata', () => {
      const msg = PromptBuilder.buildAnalysisPrompt(mockAnalysis);
      expect(msg.role).toBe('user');
      expect(msg.content).toContain('sindresorhus/ora');
      expect(msg.content).toContain('Elegant terminal spinner');
    });

    it('includes tech stack', () => {
      const msg = PromptBuilder.buildAnalysisPrompt(mockAnalysis);
      expect(msg.content).toContain('JavaScript');
    });

    it('includes user query in Direct Answer section when provided', () => {
      const msg = PromptBuilder.buildAnalysisPrompt(mockAnalysis, 'How does the spinner work?');
      expect(msg.content).toContain('How does the spinner work?');
      expect(msg.content).toContain('Query-Pivoted Blueprint');
    });

    it('does not include Direct Answer section when no query', () => {
      const msg = PromptBuilder.buildAnalysisPrompt(mockAnalysis);
      expect(msg.content).not.toContain('Query-Pivoted Blueprint');
    });
  });

  describe('buildDeepDivePrompt', () => {
    it('includes deep dive instructions', () => {
      const msg = PromptBuilder.buildDeepDivePrompt(mockAnalysis);
      expect(msg.content).toContain('Deep Dive Mode');
      expect(msg.content).toContain('Pitfalls');
    });
  });

  describe('buildMessages', () => {
    it('returns system + user messages for standard mode', () => {
      const msgs = PromptBuilder.buildMessages(mockAnalysis, 'standard');
      expect(msgs).toHaveLength(2);
      expect(msgs[0]!.role).toBe('system');
      expect(msgs[1]!.role).toBe('user');
    });

    it('returns deep dive content for deep mode', () => {
      const msgs = PromptBuilder.buildMessages(mockAnalysis, 'deep');
      expect(msgs[1]!.content).toContain('Deep Dive Mode');
    });
  });
});
