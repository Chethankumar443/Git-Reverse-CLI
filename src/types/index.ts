// ─────────────────────────────────────────────────────────────
//  git-reverse — Shared TypeScript Types
// ─────────────────────────────────────────────────────────────

export interface UserConfig {
  name: string;
  apiKey: string;
  githubToken: string;
  selectedModel: string;
  seenModelIds: string[];
  setupComplete: boolean;
  setupStep: 'username' | 'apikey' | 'model' | 'done';
}

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
  };
  description?: string;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated: boolean;
  };
  created?: number;
}

export interface CachedModels {
  models: OpenRouterModel[];
  fetchedAt: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  repoUrl: string;
  query: string;
  model: string;
  messages: Message[];
  analysisOutput: string;
  repoMeta?: RepoMeta;
  mode: AnalysisMode;
}

export interface RepoMeta {
  owner: string;
  repo: string;
  description: string;
  stars: number;
  forks?: number;
  language: string;
  topics: string[];
  defaultBranch: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
  license?: string;
  openIssues?: number;
}

export interface RepoFile {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
}

export interface RepoAnalysis {
  meta: RepoMeta;
  tree: RepoFile[];
  keyFiles: KeyFile[];
  stack: string[];
  dependencies: Record<string, string>;
}

export interface KeyFile {
  path: string;
  content: string;
  role: 'readme' | 'package' | 'config' | 'entrypoint' | 'schema' | 'other';
  size?: number;
}

export type DependencyMap = Record<string, string>;

export type AnalysisMode = 'standard' | 'deep' | 'compact' | 'query' | 'explore';

export type AppScreen =
  | 'loading'
  | 'splash'
  | 'setup-username'
  | 'setup-apikey'
  | 'setup-model'
  | 'dashboard'
  | 'analysis'
  | 'settings'
  | 'resume-session'
  | 'command-palette';

export interface AppState {
  screen: AppScreen;
  user: UserConfig | null;
  models: OpenRouterModel[];
  newModels: OpenRouterModel[];
  currentSession: Session | null;
  isStreaming: boolean;
  streamBuffer: string;
  error: string | null;
  previousScreen: AppScreen | null;
}

export interface GitHubUrlParsed {
  owner: string;
  repo: string;
  branch?: string;
  subPath?: string;
  raw: string;
}

export interface AnalysisInput {
  repoUrl: string;
  query?: string;
  mode: AnalysisMode;
  model: string;
  apiKey: string;
  githubToken?: string;
  autoCopy?: boolean;
  resumeSessionId?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface CommandEntry {
  name: string;
  aliases: string[];
  description: string;
  hint: string;
}
