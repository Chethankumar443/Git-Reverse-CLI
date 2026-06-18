// ─────────────────────────────────────────────────────────────
//  git-reverse — Setup: Username Screen
//  First-launch: captures and persists the user's name
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { setUserName, setSetupStep } from '../../config/store.js';

interface SetupUsernameProps {
  onComplete: (name: string) => void;
}

export function SetupUsername({ onComplete }: SetupUsernameProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 32) {
      setError('Name must be 32 characters or fewer.');
      return;
    }
    setUserName(trimmed);
    setSetupStep('apikey');
    onComplete(trimmed);
  };

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text color="white" dimColor>
          First time setup. This takes about 60 seconds.
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="white" dimColor>
          Step 1 of 3 — {'  '}
        </Text>
        <Text color="cyan">Who are you?</Text>
      </Box>

      <Box>
        <Text color="white" dimColor>
          {'  name  '}
        </Text>
        <TextInput
          value={value}
          onChange={(v) => {
            setValue(v);
            setError('');
          }}
          onSubmit={handleSubmit}
          placeholder="Enter your name"
        />
      </Box>

      {error && (
        <Box marginTop={1}>
          <Text color="red">{'  '}{error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="white" dimColor>
          {'  '}Press Enter to continue
        </Text>
      </Box>
    </Box>
  );
}
