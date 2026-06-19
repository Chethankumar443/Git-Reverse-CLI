export enum ErrorCode {
  GITHUB_RATE_LIMIT = 'E1001',
  GITHUB_NOT_FOUND = 'E1002',
  GITHUB_TIMEOUT = 'E1003',
  OPENROUTER_RATE_LIMIT = 'E2001',
  OPENROUTER_INVALID_KEY = 'E2002',
  OPENROUTER_MODEL_DEPRECATED = 'E2003',
  OPENROUTER_STREAM_ERROR = 'E2004',
  CONFIG_WRITE_ERROR = 'E3001',
  SESSION_CORRUPTED = 'E3002',
  NETWORK_OFFLINE = 'E4001',
}

export interface ErrorDetails {
  message: string;
  action: string;
}

export const errorMessages: Record<ErrorCode, ErrorDetails> = {
  [ErrorCode.GITHUB_RATE_LIMIT]: {
    message: 'GitHub API rate limit exceeded.',
    action: 'Wait 1 hour, or authenticate with `gh auth login` for 5,000 req/hr.',
  },
  [ErrorCode.GITHUB_NOT_FOUND]: {
    message: 'GitHub repository not found or is private.',
    action: 'Check the URL and ensure the repository is public.',
  },
  [ErrorCode.GITHUB_TIMEOUT]: {
    message: 'GitHub API request timed out.',
    action: 'Check your internet connection and try again.',
  },
  [ErrorCode.OPENROUTER_RATE_LIMIT]: {
    message: 'OpenRouter API limit reached (e.g. 20 req/min free tier).',
    action: 'Wait a few minutes, or top-up your OpenRouter account.',
  },
  [ErrorCode.OPENROUTER_INVALID_KEY]: {
    message: 'Invalid or revoked OpenRouter API key.',
    action: 'Run `/settings` to re-enter a valid API key from openrouter.ai.',
  },
  [ErrorCode.OPENROUTER_MODEL_DEPRECATED]: {
    message: 'The selected model is deprecated or no longer available.',
    action: 'Run `/settings` to choose a new model.',
  },
  [ErrorCode.OPENROUTER_STREAM_ERROR]: {
    message: 'Lost connection to OpenRouter while streaming.',
    action: 'Check your connection. The response may be truncated.',
  },
  [ErrorCode.CONFIG_WRITE_ERROR]: {
    message: 'Failed to write configuration to disk.',
    action: 'Check file permissions for ~/.config/git-reverse',
  },
  [ErrorCode.SESSION_CORRUPTED]: {
    message: 'Session file is corrupted.',
    action: 'You may need to start a new session.',
  },
  [ErrorCode.NETWORK_OFFLINE]: {
    message: 'No internet connection detected.',
    action: 'Please reconnect to the internet and try again.',
  },
};

export class GitReverseError extends Error {
  public code: ErrorCode;
  public details: ErrorDetails;

  constructor(code: ErrorCode, customMessage?: string) {
    super(customMessage || errorMessages[code].message);
    this.name = 'GitReverseError';
    this.code = code;
    this.details = errorMessages[code];
  }
}
