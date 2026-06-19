// ─────────────────────────────────────────────────────────────
//  git-reverse — Analysis Service
//  Master Prompt Extraction Pipeline orchestrator:
//  GitHub skeleton fetch → PromptBuilder → LLM stream
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

// Human-readable step labels shown in the TUI spinner badge
export const PHASE_LABELS: Record<AnalysisPhase, string> = {
  idle:            'IDLE',
  'parsing-url':   'RESOLVE',
  'scanning-local':'SCAN',
  'fetching-meta': 'META',
  'fetching-tree': 'SKELETON',
  'fetching-files':'MANIFESTS',
  'building-prompt':'SYNTHESIZE',
  streaming:       'GENERATE',
  done:            'DONE',
  error:           'ERROR',
};

export interface AnalysisProgress {
  phase: AnalysisPhase;
  message: string;
  step?: string;       // badge label for TUI spinner
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

    // ── Branch: general chatbot (no repo URL) ─────────────
    if (repoUrl === 'chat') {
      onProgress({
        phase: 'building-prompt',
        step: 'CONNECT',
        message: 'Connecting to OpenRouter...',
      });

      const messages: Message[] = [
        PromptBuilder.buildChatSystemPrompt(mode),
        { role: 'user', content: query || 'Hello' },
      ];

      onProgress({
        phase: 'streaming',
        step: 'GENERATE',
        message: `Chatting with ${model.split('/').pop()}...`,
      });

      yield* this.openrouterClient.streamCompletion(model, messages, {
        maxTokens: 4096,
        temperature: 0.5,
      });

      onProgress({ phase: 'done', message: 'Done.', messages });
      return;
    }

    let analysis: RepoAnalysis;

    // ── Branch: local directory ────────────────────────────
    if (isLocalPath(repoUrl)) {
      onProgress({
        phase: 'scanning-local',
        step: 'SCAN',
        message: `Scanning local directory: ${repoUrl}`,
      });

      try {
        analysis = await GitHubClient.analyzeLocalDir(repoUrl, (phase) => {
          if (phase === 'fetching-tree') {
            onProgress({
              phase: 'fetching-tree',
              step: PHASE_LABELS['fetching-tree'],
              message: 'Mapping architecture skeleton...',
            });
          } else if (phase === 'fetching-files') {
            onProgress({
              phase: 'fetching-files',
              step: PHASE_LABELS['fetching-files'],
              message: 'Reading manifests & configs...',
            });
          }
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to scan local directory "${repoUrl}":\n${msg}`);
      }

    // ── Branch: GitHub URL ────────────────────────────────
    } else {
      onProgress({
        phase: 'parsing-url',
        step: PHASE_LABELS['parsing-url'],
        message: 'Resolving repository...',
      });

      const parsed = GitHubClient.parseUrl(repoUrl);
      if (!parsed) {
        throw new Error(
          `Could not parse GitHub URL: "${repoUrl}"\n` +
            'Expected: https://github.com/owner/repo  or a local path like . or ./my-project',
        );
      }

      try {
        onProgress({
          phase: 'fetching-meta',
          step: PHASE_LABELS['fetching-meta'],
          message: `Fetching ${parsed.owner}/${parsed.repo} metadata...`,
        });

        const meta = await this.githubClient.fetchRepoMeta(parsed.owner, parsed.repo);

        onProgress({
          phase: 'fetching-tree',
          step: PHASE_LABELS['fetching-tree'],
          message: `Mapping architecture skeleton (${meta.defaultBranch})...`,
          repoMeta: meta,
        });

        const branch = parsed.branch ?? meta.defaultBranch;
        const tree = await this.githubClient.fetchRepoTree(parsed.owner, parsed.repo, branch);

        const fileCount = tree.filter((f) => f.type === 'file').length;
        onProgress({
          phase: 'fetching-files',
          step: PHASE_LABELS['fetching-files'],
          message: `Reading manifests & configs (${Math.min(fileCount, 12)} key files)...`,
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
              step: PHASE_LABELS['fetching-files'],
              message: `Reading manifests & configs (${fetched}/${total})...`,
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
              'Check the URL and ensure the repository is public (or add a GitHub token in Settings for private repos).',
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

    // ── Build Master Prompt ───────────────────────────────
    onProgress({
      phase: 'building-prompt',
      step: PHASE_LABELS['building-prompt'],
      message: 'Synthesizing Master Prompt...',
      repoMeta: analysis.meta,
    });

    const messages: Message[] = PromptBuilder.buildMessages(analysis, mode, query);

    // Token budget check
    const estimatedTokens = PromptBuilder.estimateTokens(messages);
    const cached = getCachedModels();
    const modelData = cached.models.find((m) => m.id === model);
    const contextLimit = modelData?.context_length ?? 8192;

    if (estimatedTokens > contextLimit * 0.85) {
      throw new Error(
        `Repository skeleton is too large for this model (${estimatedTokens.toLocaleString()} / ${contextLimit.toLocaleString()} tokens).\n` +
          'Try: \\compact mode to reduce output, or switch to a 100k+ context model in Settings.',
      );
    }

    // ── Stream LLM response ───────────────────────────────
    onProgress({
      phase: 'streaming',
      step: PHASE_LABELS['streaming'],
      message: `Generating blueprint with ${model.split('/').pop()}...`,
      repoMeta: analysis.meta,
    });

    const streamOptions = {
      maxTokens: mode === 'deep' ? 8192 : mode === 'compact' ? 2048 : 6144,
      temperature: mode === 'deep' ? 0.35 : mode === 'compact' ? 0.2 : 0.25,
    };

    try {
      yield* this.openrouterClient.streamCompletion(model, messages, streamOptions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Fallback on model not found, rate limits specific to model, or deprecated
      if (msg.includes('404') || msg.includes('403') || msg.includes('deprecated') || msg.includes('E2003')) {
        const fallbackModel = cached.models.find((m) => m.id !== model)?.id;
        if (fallbackModel) {
          onProgress({
            phase: 'streaming',
            step: PHASE_LABELS['streaming'],
            message: `Model failed. Falling back to ${fallbackModel.split('/').pop()}...`,
            repoMeta: analysis.meta,
          });
          yield* this.openrouterClient.streamCompletion(fallbackModel, messages, streamOptions);
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    onProgress({
      phase: 'done',
      message: 'Master Prompt complete.',
      repoMeta: analysis.meta,
      messages,
    });
  }

  // ── Summarize existing session ─────────────────────────

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

  // ── Static helper for repo meta display ───────────────

  static formatRepoStats(meta: RepoAnalysis['meta']): string {
    if (meta.owner === 'local') {
      return `local:${meta.repo}`;
    }
    return `${meta.owner}/${meta.repo} · ${meta.language} · ★ ${meta.stars.toLocaleString()}`;
  }
}
