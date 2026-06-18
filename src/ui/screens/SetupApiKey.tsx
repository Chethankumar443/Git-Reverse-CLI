// ─────────────────────────────────────────────────────────────
//  git-reverse — Setup: API Key Screen
//  Validates OpenRouter key, lists free models
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import terminalLink from 'terminal-link';
import { OpenRouterClient } from '../../api/OpenRouterClient.js';
import { setApiKey, setSetupStep, setCachedModels, markModelsSeen } from '../../config/store.js';
import { Spinner } from '../components/Spinner.js';
import type { OpenRouterModel } from '../../types/index.js';

interface SetupApiKeyProps {
  onComplete: (models: OpenRouterModel[]) => void;
}

type Phase = 'input' | 'validating' | 'done' | 'error';

const OPENROUTER_KEYS_URL = 'https://openrouter.ai/keys';
const OPENROUTER_LINK = terminalLink('openrouter.ai/keys', OPENROUTER_KEYS_URL, {
  fallback: (_, url) => url,
});

export function SetupApiKey({ onComplete }: SetupApiKeyProps) {
  const [value, setValue] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [error, setError] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([]);

  const handleSubmit = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed.startsWith('sk-or-')) {
      setError('OpenRouter keys start with "sk-or-". Check your key.');
      return;
    }

    setPhase('validating');
    setError('');

    try {
      const client = new OpenRouterClient(trimmed);

      const { valid, error: validError } = await client.validateKey();
      if (!valid) {
        setPhase('error');
        setError(validError ?? 'Validation failed.');
        return;
      }

      const freeModels = await client.fetchFreeModels();

      // Persist
      setApiKey(trimmed);
      setCachedModels(freeModels);
      markModelsSeen(freeModels.map((m) => m.id));
      setSetupStep('model');

      setModels(freeModels);
      setPhase('done');

      // Short pause so user sees the model count
      setTimeout(() => onComplete(freeModels), 600);
    } catch (err: unknown) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Unknown error during validation.');
    }
  };

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text color="white" dimColor>
          Step 2 of 3 — {'  '}
        </Text>
        <Text color="cyan">OpenRouter API Key</Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text color="white" dimColor>
          {'  '}Get a free key at{' '}
          <Text color="cyan">{OPENROUTER_LINK}</Text>
        </Text>
        <Text color="white" dimColor>
          {'  '}Create an account → API Keys → Create Key → copy it below.
        </Text>
      </Box>

      {phase === 'input' || phase === 'error' ? (
        <Box flexDirection="column">
          <Box>
            <Text color="white" dimColor>
              {'  key  '}
            </Text>
            <TextInput
              value={value}
              onChange={(v) => {
                setValue(v);
                setError('');
                if (phase === 'error') setPhase('input');
              }}
              onSubmit={handleSubmit}
              placeholder="sk-or-v1-..."
              mask="*"
            />
          </Box>

          {error && (
            <Box marginTop={1}>
              <Text color="red">{'  '}{error}</Text>
            </Box>
          )}

          <Box marginTop={1}>
            <Text color="white" dimColor>
              {'  '}Press Enter to validate
            </Text>
          </Box>
        </Box>
      ) : phase === 'validating' ? (
        <Box flexDirection="column" gap={1}>
          <Spinner label="Validating key..." />
          <Spinner label="Fetching free models..." color="white" />
        </Box>
      ) : (
        <Box flexDirection="column">
          <Box>
            <Text color="green">{'  '}✓ Key valid</Text>
          </Box>
          <Box>
            <Text color="white" dimColor>
              {'  '}Found{' '}
            </Text>
            <Text color="cyan">{models.length}</Text>
            <Text color="white" dimColor>
              {' '}free model{models.length !== 1 ? 's' : ''}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
