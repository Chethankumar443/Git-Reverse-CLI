// ─────────────────────────────────────────────────────────────
//  git-reverse — Settings Screen
//  Change username, API key, GitHub token, or active model
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import terminalLink from 'terminal-link';
import {
  getUser,
  setUserName,
  setApiKey,
  setGithubToken,
  getCachedModels,
  setCachedModels,
  markModelsSeen,
  getStorePath,
} from '../../config/store.js';
import { OpenRouterClient } from '../../api/OpenRouterClient.js';
import { GitHubClient } from '../../api/GitHubClient.js';
import { SetupModel } from './SetupModel.js';
import { Spinner } from '../components/Spinner.js';

import type { OpenRouterModel } from '../../types/index.js';
import { truncate } from '../../utils/format.js';

type SettingsView =
  | 'menu'
  | 'change-name'
  | 'change-key'
  | 'change-github-token'
  | 'change-model'
  | 'view-sessions'
  | 'refreshing';

interface SettingsScreenProps {
  onBack: () => void;
  onModelChanged: (model: OpenRouterModel) => void;
  onUsernameChanged: (name: string) => void;
}

const MENU_ITEMS = [
  { label: 'Change username', value: 'change-name' },
  { label: 'Change OpenRouter API key', value: 'change-key' },
  { label: 'Set / update GitHub token', value: 'change-github-token' },
  { label: 'Change active model', value: 'change-model' },
  { label: 'Refresh model list', value: 'refresh-models' },
  { label: '─────────────────────', value: 'sep', disabled: true },
  { label: 'Back to dashboard', value: 'back' },
];

export function SettingsScreen({ onBack, onModelChanged, onUsernameChanged }: SettingsScreenProps) {
  const user = getUser();
  const cached = getCachedModels();

  const [view, setView] = useState<SettingsView>('menu');
  const [nameValue, setNameValue] = useState(user.name);
  const [keyValue, setKeyValue] = useState('');
  const [ghTokenValue, setGhTokenValue] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>(cached.models);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Esc: go back from any sub-view or back to dashboard from menu
  useInput((_, key) => {
    if (key.escape) {
      if (view === 'menu') {
        onBack();
      } else if (view !== 'refreshing') {
        setView('menu');
        setError('');
        setStatus('');
      }
    }
  });

  const handleMenuSelect = async (item: { value: string }) => {
    if (item.value === 'back') { onBack(); return; }
    if (item.value === 'sep') return;
    if (item.value === 'refresh-models') {
      setView('refreshing');
      try {
        const client = new OpenRouterClient(user.apiKey);
        const fresh = await client.fetchFreeModels();
        setCachedModels(fresh);
        markModelsSeen(fresh.map((m) => m.id));
        setModels(fresh);
        setStatus(`${fresh.length} models refreshed.`);
        setTimeout(() => { setStatus(''); setView('menu'); }, 1500);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Refresh failed.');
        setView('menu');
      }
      return;
    }
    setError('');
    setStatus('');
    setView(item.value as SettingsView);
  };

  const handleNameSubmit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed.length < 2) { setError('Name must be at least 2 characters.'); return; }
    setUserName(trimmed);
    onUsernameChanged(trimmed);
    setStatus(`Username updated to "${trimmed}".`);
    setTimeout(() => { setStatus(''); setView('menu'); }, 1200);
  };

  const handleKeySubmit = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed.startsWith('sk-or-')) { setError('Invalid key format. Must start with sk-or-'); return; }
    setView('refreshing');
    try {
      const client = new OpenRouterClient(trimmed);
      const { valid, error: ve } = await client.validateKey();
      if (!valid) { setError(ve ?? 'Validation failed.'); setView('change-key'); return; }
      const fresh = await client.fetchFreeModels();
      setApiKey(trimmed);
      setCachedModels(fresh);
      markModelsSeen(fresh.map((m) => m.id));
      setModels(fresh);
      setStatus('Key updated and models refreshed.');
      setTimeout(() => { setStatus(''); setView('menu'); }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed.');
      setView('change-key');
    }
  };

  const handleGithubTokenSubmit = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      // Allow clearing the token
      setGithubToken('');
      setStatus('GitHub token cleared.');
      setTimeout(() => { setStatus(''); setView('menu'); }, 1200);
      return;
    }
    if (!trimmed.startsWith('ghp_') && !trimmed.startsWith('github_pat_') && !trimmed.startsWith('gho_')) {
      setError('Token must start with ghp_, github_pat_, or gho_');
      return;
    }
    setView('refreshing');
    try {
      const result = await GitHubClient.validateGithubToken(trimmed);
      if (!result.valid) {
        setError(result.error ?? 'Token validation failed.');
        setView('change-github-token');
        return;
      }
      setGithubToken(trimmed);
      setStatus(`✓ Authenticated as @${result.login} (scopes: ${result.scopes})`);
      setTimeout(() => { setStatus(''); setView('menu'); }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Validation failed.');
      setView('change-github-token');
    }
  };

  const currentUser = getUser();
  const hasGhToken = !!currentUser.githubToken;

  return (
    <Box flexGrow={1} justifyContent="center" alignItems="center" flexDirection="column" width="100%">
      <Box flexDirection="column" alignItems="center">
        <Box marginBottom={1}>
        <Text color="cyan">Settings</Text>
        <Text color="white" dimColor>  · {user.name} · {truncate(user.selectedModel.split('/').pop() ?? user.selectedModel, 30)}</Text>
      </Box>

      <Box marginBottom={0}>
        <Text color="white" dimColor>
          {'  Config: '}{getStorePath()}
        </Text>
      </Box>

      {hasGhToken && (
        <Box marginTop={0}>
          <Text color="green" dimColor>  ✓ GitHub token active</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="white" dimColor>{'─'.repeat(44)}</Text>
      </Box>

      {status && (
        <Box marginBottom={1}>
          <Text color="green">{'  '}✓ {status}</Text>
        </Box>
      )}
      {error && (
        <Box marginBottom={1}>
          <Text color="red">{'  '}✗ {error}</Text>
        </Box>
      )}

      {view === 'menu' && (
        <Box marginTop={1} alignItems="center">
          <SelectInput
            items={MENU_ITEMS.filter((i) => !('disabled' in i && i.disabled))}
            onSelect={handleMenuSelect}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? 'cyan' : 'white'} dimColor={!isSelected}>
                {isSelected ? '› ' : '  '}{label}
              </Text>
            )}
          />
        </Box>
      )}

      {view === 'change-name' && (
        <Box marginTop={1} flexDirection="column" alignItems="center">
          <Text color="white" dimColor>New username:</Text>
          <Box marginTop={1}>
            <TextInput
              value={nameValue}
              onChange={(v) => { setNameValue(v); setError(''); }}
              onSubmit={handleNameSubmit}
              placeholder={user.name}
            />
          </Box>
        </Box>
      )}

      {view === 'change-key' && (
        <Box marginTop={1} flexDirection="column" alignItems="center">
          <Text color="white" dimColor>New OpenRouter API key:</Text>
          <Box marginTop={0} marginBottom={1}>
            <Text color="white" dimColor>
              Get a key at{' '}
              <Text color="cyan">{terminalLink('openrouter.ai/keys', 'https://openrouter.ai/keys', { fallback: (_, url) => url })}</Text>
            </Text>
          </Box>
          <Box marginTop={1}>
            <TextInput
              value={keyValue}
              onChange={(v) => { setKeyValue(v); setError(''); }}
              onSubmit={handleKeySubmit}
              placeholder="sk-or-v1-..."
              mask="*"
            />
          </Box>
        </Box>
      )}

      {view === 'change-github-token' && (
        <Box marginTop={1} flexDirection="column" alignItems="center">
          {/* Instructions */}
          <Box flexDirection="column" alignItems="center" marginBottom={1}>
            <Text color="cyan" bold>GitHub Personal Access Token</Text>
            <Text color="white" dimColor> </Text>
            <Text color="white" dimColor>Why?  Unauthenticated: 60 req/hr  →  With token: 5,000 req/hr</Text>
            <Text color="white" dimColor>Also required for private repositories.</Text>
            <Text color="white" dimColor> </Text>
            <Text color="white" dimColor>How to generate:</Text>
            <Text color="yellow">  1. github.com → Settings → Developer settings</Text>
            <Text color="yellow">  2. Personal access tokens → Tokens (classic)</Text>
            <Text color="yellow">  3. Generate new token → select: repo (read), public_repo</Text>
            <Text color="yellow">  4. Copy the token (ghp_... or github_pat_...)</Text>
            <Text color="white" dimColor> </Text>
            <Text color="white" dimColor>Paste token below (Enter to save, empty Enter to clear):</Text>
          </Box>
          <Box marginTop={1}>
            <TextInput
              value={ghTokenValue}
              onChange={(v) => { setGhTokenValue(v); setError(''); }}
              onSubmit={handleGithubTokenSubmit}
              placeholder="ghp_... or github_pat_..."
              mask="*"
            />
          </Box>
          {hasGhToken && (
            <Box marginTop={1}>
              <Text color="white" dimColor>  Current token: active (press Enter on empty input to clear)</Text>
            </Box>
          )}
        </Box>
      )}

      {view === 'change-model' && (
        <SetupModel
          models={models}
          isSettings
          onComplete={(m) => {
            onModelChanged(m);
            setStatus(`Model set to ${m.id}`);
            setTimeout(() => { setStatus(''); setView('menu'); }, 1000);
          }}
        />
      )}

      {view === 'refreshing' && (
        <Box marginTop={1}>
          <Spinner label="Working..." />
        </Box>
      )}

      {view === 'menu' && (
        <Box marginTop={1} alignItems="center">
          <Text color="white" dimColor>Esc to go back</Text>
        </Box>
      )}

      {(view === 'change-name' || view === 'change-key' || view === 'change-github-token') && (
        <Box marginTop={1} alignItems="center">
          <Text color="white" dimColor>Esc to cancel</Text>
        </Box>
      )}
      </Box>
    </Box>
  );
}
