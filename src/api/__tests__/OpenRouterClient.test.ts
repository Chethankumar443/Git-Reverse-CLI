// ─────────────────────────────────────────────────────────────
//  git-reverse — OpenRouterClient Tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterClient } from '../OpenRouterClient.js';

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        get: vi.fn(),
        post: vi.fn(),
      })),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

describe('OpenRouterClient', () => {
  describe('isCacheStale', () => {
    it('returns true if fetchedAt is 0', () => {
      expect(OpenRouterClient.isCacheStale(0)).toBe(true);
    });

    it('returns true if cache is older than 1 hour', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      expect(OpenRouterClient.isCacheStale(twoHoursAgo)).toBe(true);
    });

    it('returns false if cache is fresh', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(OpenRouterClient.isCacheStale(fiveMinutesAgo)).toBe(false);
    });
  });
});
