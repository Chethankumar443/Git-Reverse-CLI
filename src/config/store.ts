// ─────────────────────────────────────────────────────────────
//  git-reverse — Persistent Config Store
//  Uses `conf` for cross-platform local storage
//  Location: ~/.config/git-reverse (Linux/Mac) or %APPDATA%\git-reverse (Win)
// ─────────────────────────────────────────────────────────────

import Conf from 'conf';
import type { UserConfig, CachedModels, Session } from '../types/index.js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { encryptSecret, decryptSecret, isEncrypted } from './crypto.js';

interface StoreSchema {
  user: UserConfig;
  cachedModels: CachedModels;
  sessions: Record<string, Session>;
  lastLaunchVersion: string;
}

const store = new Conf<StoreSchema>({
  projectName: 'git-reverse',
  projectVersion: '1.0.0',
  defaults: {
    user: {
      name: '',
      apiKey: '',
      githubToken: '',
      selectedModel: '',
      seenModelIds: [],
      setupComplete: false,
      setupStep: 'username',
    },
    cachedModels: {
      models: [],
      fetchedAt: 0,
    },
    sessions: {},
    lastLaunchVersion: '',
  },
  schema: {
    user: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        apiKey: { type: 'string' },
        githubToken: { type: 'string' },
        selectedModel: { type: 'string' },
        seenModelIds: { type: 'array', items: { type: 'string' } },
        setupComplete: { type: 'boolean' },
        setupStep: { type: 'string' },
      },
    },
    cachedModels: {
      type: 'object',
      properties: {
        models: { type: 'array' },
        fetchedAt: { type: 'number' },
      },
    },
    sessions: { type: 'object' },
    lastLaunchVersion: { type: 'string' },
  },
});

import { Entry } from '@napi-rs/keyring';

/**
 * Read the user config. Attempts to load secrets from the OS Keychain.
 * If secrets are missing in the keychain but present in the legacy `conf` file,
 * it migrates them to the keychain and removes them from `conf`.
 */
export function getUser(): UserConfig {
  const user = store.get('user');
  let migrated = false;

  const readSecret = (field: 'apiKey' | 'githubToken'): string => {
    try {
      const entry = new Entry('git-reverse', field);
      const keychainVal = entry.getPassword();
      if (keychainVal) return keychainVal;
    } catch {
      // Ignore keychain read errors (e.g., missing headless support)
    }

    // Fallback: check legacy conf
    const raw = user[field];
    if (!raw) return '';
    
    migrated = true;
    if (isEncrypted(raw)) return decryptSecret(raw);
    return raw;
  };

  const result: UserConfig = {
    ...user,
    apiKey: readSecret('apiKey'),
    githubToken: readSecret('githubToken'),
  };

  if (migrated) {
    // Save to keychain. The setter functions will handle wiping from conf
    // if successful, or keeping it in conf if the keychain fails.
    setApiKey(result.apiKey);
    setGithubToken(result.githubToken);
  }

  return result;
}

export interface LocalConfig {
  selectedModel?: string;
  githubToken?: string;
}

export function getLocalConfig(): LocalConfig | null {
  try {
    const localPath = join(process.cwd(), '.gitreverse');
    if (existsSync(localPath)) {
      const content = readFileSync(localPath, 'utf8');
      return JSON.parse(content);
    }
    const localJsonPath = join(process.cwd(), '.gitreverse.json');
    if (existsSync(localJsonPath)) {
      const content = readFileSync(localJsonPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    // Ignore parsing errors
  }
  return null;
}

export function getMergedUserConfig(): UserConfig {
  const globalUser = getUser();
  const local = getLocalConfig();
  if (!local) return globalUser;

  return {
    ...globalUser,
    selectedModel: local.selectedModel || globalUser.selectedModel,
    githubToken: local.githubToken || globalUser.githubToken,
  };
}

export function setUserName(name: string): void {
  const user = store.get('user');
  store.set('user', { ...user, name: name.trim() });
}

export function setApiKey(apiKey: string): void {
  let keychainSuccess = false;
  try {
    const entry = new Entry('git-reverse', 'apiKey');
    if (apiKey) {
      entry.setPassword(apiKey);
    } else {
      entry.deletePassword();
    }
    keychainSuccess = true;
  } catch {
    // Ignore headless/no-keychain environment errors
  }

  const user = store.get('user');
  if (keychainSuccess) {
    store.set('user', { ...user, apiKey: '' });
  } else {
    // Fallback: save to plain conf
    store.set('user', { ...user, apiKey });
  }
}

export function setGithubToken(token: string): void {
  let keychainSuccess = false;
  try {
    const entry = new Entry('git-reverse', 'githubToken');
    if (token) {
      entry.setPassword(token);
    } else {
      entry.deletePassword();
    }
    keychainSuccess = true;
  } catch {
    // Ignore headless/no-keychain environment errors
  }

  const user = store.get('user');
  if (keychainSuccess) {
    store.set('user', { ...user, githubToken: '' });
  } else {
    // Fallback: save to plain conf
    store.set('user', { ...user, githubToken: token });
  }
}

export function setSelectedModel(modelId: string): void {
  const user = getUser();
  store.set('user', { ...user, selectedModel: modelId });
}

export function setSetupStep(step: UserConfig['setupStep']): void {
  const user = getUser();
  store.set('user', { ...user, setupStep: step });
}

export function markSetupComplete(): void {
  const user = getUser();
  store.set('user', { ...user, setupComplete: true, setupStep: 'done' });
}

export function markModelsSeen(modelIds: string[]): void {
  const user = getUser();
  const combined = Array.from(new Set([...user.seenModelIds, ...modelIds]));
  store.set('user', { ...user, seenModelIds: combined });
}

// ── Model Cache ───────────────────────────────────────────────

export function getCachedModels(): CachedModels {
  return store.get('cachedModels');
}

export function setCachedModels(models: CachedModels['models']): void {
  store.set('cachedModels', { models, fetchedAt: Date.now() });
}

// Returns model IDs that are new (not in seenModelIds)
export function getNewModels(fetchedModels: CachedModels['models']): CachedModels['models'] {
  const { seenModelIds } = getUser();
  return fetchedModels.filter((m) => !seenModelIds.includes(m.id));
}

// ── Sessions ──────────────────────────────────────────────────

export function saveSession(session: Session): void {
  const sessions = store.get('sessions');
  store.set('sessions', { ...sessions, [session.id]: session });
}

export function getSession(id: string): Session | null {
  const sessions = store.get('sessions');
  return sessions[id] ?? null;
}

export function getAllSessions(): Session[] {
  const sessions = store.get('sessions');
  return Object.values(sessions).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function deleteSession(id: string): void {
  const sessions = store.get('sessions');
  delete sessions[id];
  store.set('sessions', sessions);
}

// ── Meta ──────────────────────────────────────────────────────

export function getStorePath(): string {
  return store.path;
}

export function clearAll(): void {
  store.clear();
}

export { store };
