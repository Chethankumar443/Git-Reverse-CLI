// ─────────────────────────────────────────────────────────────
//  git-reverse — OpenRouter API Client
//  Uses the official OpenAI SDK for clean streaming support
//  OpenRouter is 100% compatible with the OpenAI API
// ─────────────────────────────────────────────────────────────

import OpenAI from 'openai';
import axios from 'axios';
import type { OpenRouterModel, Message, StreamChunk } from '../types/index.js';

const BASE_URL = 'https://openrouter.ai/api/v1';
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export class OpenRouterClient {
  private openai: OpenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({
      apiKey,
      baseURL: BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/git-reverse/git-reverse',
        'X-Title': 'git-reverse',
      },
      timeout: 120_000,
    });
  }

  // ── Validation ────────────────────────────────────────────

  async validateKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      const res = await axios.get(`${BASE_URL}/auth/key`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/git-reverse/git-reverse',
        },
        timeout: 10_000,
      });
      if (res.status === 200 && res.data?.data) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid API key response' };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          return { valid: false, error: 'E2002: Invalid or revoked API key — check your key and try again.' };
        }
        if (err.response?.status === 429) {
          return { valid: false, error: 'E2001: Rate limited — wait a moment and try again.' };
        }
        return { valid: false, error: err.message };
      }
      return { valid: false, error: 'E4001: Network error — check your connection.' };
    }
  }

  // ── Models ────────────────────────────────────────────────

  async fetchModels(): Promise<OpenRouterModel[]> {
    const res = await axios.get(`${BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/git-reverse/git-reverse',
      },
      timeout: 15_000,
    });
    return (res.data?.data ?? []) as OpenRouterModel[];
  }

  async fetchFreeModels(): Promise<OpenRouterModel[]> {
    const all = await this.fetchModels();
    return all.filter((m) => {
      const promptPrice = parseFloat(m.pricing?.prompt ?? '1');
      const completionPrice = parseFloat(m.pricing?.completion ?? '1');
      return promptPrice === 0 && completionPrice === 0;
    });
  }

  // ── Streaming Completion (OpenAI SDK) ─────────────────────

  async *streamCompletion(
    model: string,
    messages: Message[],
    options: {
      maxTokens?: number;
      temperature?: number;
      onChunk?: (chunk: StreamChunk) => void;
    } = {},
  ): AsyncGenerator<StreamChunk> {
    const { maxTokens = 4096, temperature = 0.3 } = options;

    const stream = await this.openai.chat.completions.create({
      model,
      // @ts-ignore — OpenAI SDK types are strict, but OpenRouter accepts same shape
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      stream: true,
      max_tokens: maxTokens,
      temperature,
    });

    try {
      for await (const event of stream) {
        const content = event.choices[0]?.delta?.content ?? '';
        const isDone = event.choices[0]?.finish_reason != null;

        if (content) {
          const chunk: StreamChunk = { content, done: false };
          options.onChunk?.(chunk);
          yield chunk;
        }

        if (isDone) {
          const done: StreamChunk = { content: '', done: true };
          options.onChunk?.(done);
          yield done;
          break;
        }
      }
    } catch (err: unknown) {
      // OpenAI SDK throws on stream abort — if we already got content, ignore
      const msg = err instanceof Error ? err.message : String(err);
      const isStreamClose =
        msg === 'aborted' ||
        msg.includes('ECONNRESET') ||
        msg.includes('socket hang up') ||
        msg.includes('premature close') ||
        (err instanceof Error && err.name === 'AbortError');
      if (!isStreamClose) throw err;
    }
  }

  // ── One-shot Completion (non-streaming) ───────────────────

  async complete(
    model: string,
    messages: Message[],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const { maxTokens = 4096, temperature = 0.3 } = options;
    const completion = await this.openai.chat.completions.create({
      model,
      // @ts-ignore
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      stream: false,
      max_tokens: maxTokens,
      temperature,
    });
    return completion.choices[0]?.message?.content ?? '';
  }

  static isCacheStale(fetchedAt: number): boolean {
    return Date.now() - fetchedAt > CACHE_TTL_MS;
  }
}
