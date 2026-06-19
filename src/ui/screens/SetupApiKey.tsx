// ─────────────────────────────────────────────────────────────
//  git-reverse — Setup: API Key Screen
//  Validates OpenRouter key, lists free models
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Box, Text } from 'ink';
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

  const isInput = phase === 'input' || phase === 'error';

  return (
    <Box flexGrow={1} justifyContent="center" alignItems="center" flexDirection="column" width="100%">
      <Box flexDirection="column" alignItems="center" paddingY={2} width={70}>
        {/* Header Banner */}
      <Box marginBottom={2} flexDirection="row">
        <Text color="black" backgroundColor="white" bold>  GIT-REVERSE  </Text>
        <Text color="white" dimColor>  v1.2.0 initial setup</Text>
      </Box>

      {/* Step progress badges */}
      <Box marginBottom={2} flexDirection="row" alignItems="center">
        <Text color="white" dimColor>1 </Text>
        <Box paddingX={1}><Text color="white" dimColor>NAME</Text></Box>
        <Text color="white" dimColor>───</Text>
        <Text color="black" backgroundColor="cyan" bold> 2 </Text>
        <Box paddingX={1}><Text color="cyan" bold>API KEY</Text></Box>
        <Text color="white" dimColor>───</Text>
        <Box paddingX={1}><Text color="white" dimColor>3</Text></Box>
        <Box paddingX={1}><Text color="white" dimColor>MODEL</Text></Box>
      </Box>

      {/* Instructions */}
      <Box marginBottom={2} flexDirection="column">
        <Box flexDirection="row">
          <Text color="white" dimColor>Get a free key at </Text>
          <Text color="cyan" bold>{OPENROUTER_LINK}</Text>
        </Box>
        <Text color="white" dimColor>Create account → API Keys → Create Key → paste below.</Text>
      </Box>

      {/* Input state */}
      {isInput && (
        <Box
          flexDirection="column"
          alignItems="center"
          borderStyle="bold"
          borderColor={phase === 'error' ? 'red' : 'cyan'}
          paddingX={2}
          paddingY={1}
        >
          <Box flexDirection="row" alignItems="center" marginBottom={1}>
            <Text color="black" backgroundColor={phase === 'error' ? 'red' : 'cyan'} bold>  OPENROUTER API KEY  </Text>
          </Box>
          <Box flexDirection="row" alignItems="center" marginBottom={1}>
            <Text color={phase === 'error' ? 'red' : 'cyan'} bold>›  </Text>
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
          <Box height={1}>
            {error
              ? <Text color="red" bold>✗ {error}</Text>
              : <Text color="white" dimColor>Stored locally in ~/.config/git-reverse</Text>
            }
          </Box>
        </Box>
      )}

      {/* Validating state */}
      {phase === 'validating' && (
        <Box flexDirection="column" alignItems="center" borderStyle="bold" borderColor="cyan" paddingX={2} paddingY={1}>
           <Box marginBottom={1}>
             <Text color="black" backgroundColor="cyan" bold>  VERIFYING...  </Text>
           </Box>
           <Spinner label="Validating key…" step="1/2" />
           <Spinner label="Fetching free models…" color="white" step="2/2" />
        </Box>
      )}

      {/* Done state */}
      {phase === 'done' && (
        <Box flexDirection="column" alignItems="center" borderStyle="bold" borderColor="green" paddingX={2} paddingY={1}>
          <Box flexDirection="row" alignItems="center" marginBottom={1}>
            <Text color="black" backgroundColor="green" bold>  ✓ KEY VALID  </Text>
          </Box>
          <Box flexDirection="row">
            <Text color="green" dimColor>Found </Text>
            <Text color="cyan" bold>{models.length}</Text>
            <Text color="green" dimColor> free model{models.length !== 1 ? 's' : ''}</Text>
          </Box>
        </Box>
      )}

      {/* Keyboard hint */}
      {isInput && (
        <Box marginTop={2} flexDirection="row" alignItems="center">
          <Text color="white" dimColor>Press </Text>
          <Text color="black" backgroundColor="white" bold> Enter </Text>
          <Text color="white" dimColor> to validate</Text>
        </Box>
      )}
      </Box>
    </Box>
  );
}
