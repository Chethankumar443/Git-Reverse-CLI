// ─────────────────────────────────────────────────────────────
//  git-reverse — Format Utils Tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  truncate,
  timeAgo,
  formatModelId,
  formatModelProvider,
  countWords,
  wrapText,
} from '../../utils/format.js';

describe('truncate', () => {
  it('returns string unchanged if under limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });
  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });
});

describe('formatModelId', () => {
  it('strips provider prefix and :free suffix', () => {
    expect(formatModelId('google/gemma-3-27b-it:free')).toBe('gemma-3-27b');
  });
  it('strips -it suffix', () => {
    expect(formatModelId('meta-llama/llama-3-8b-it:free')).toBe('llama-3-8b');
  });
});

describe('formatModelProvider', () => {
  it('returns provider portion', () => {
    expect(formatModelProvider('google/gemma-3')).toBe('google');
    expect(formatModelProvider('meta-llama/llama-3-8b')).toBe('meta-llama');
  });
});

describe('countWords', () => {
  it('counts words correctly', () => {
    expect(countWords('hello world foo')).toBe(3);
    expect(countWords('  lots   of   spaces  ')).toBe(3);
  });
  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });
});

describe('wrapText', () => {
  it('wraps text at given width', () => {
    const lines = wrapText('hello world foo bar', 10);
    expect(lines.every((l) => l.length <= 10)).toBe(true);
  });
});
