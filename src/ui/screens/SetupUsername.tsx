// ─────────────────────────────────────────────────────────────
//  git-reverse — Setup: Username Screen
//  First-launch: captures and persists the user's name
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Box, Text } from 'ink';
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
    <Box flexGrow={1} justifyContent="center" alignItems="center" flexDirection="column" width="100%">
      <Box flexDirection="column" alignItems="center" paddingY={2} width={70}>
        {/* Header Banner */}
      <Box marginBottom={2} flexDirection="row">
        <Text color="black" backgroundColor="white" bold>  GIT-REVERSE  </Text>
        <Text color="white" dimColor>  v1.2.0 initial setup</Text>
      </Box>

      {/* Setup intro */}
      <Box marginBottom={2}>
        <Text color="white" dimColor>Welcome. First time setup takes about 60 seconds.</Text>
      </Box>

      {/* Step progress badges */}
      <Box marginBottom={2} flexDirection="row" alignItems="center">
        <Text color="black" backgroundColor="cyan" bold> 1 </Text>
        <Box paddingX={1}><Text color="cyan" bold>NAME</Text></Box>
        <Text color="white" dimColor>───</Text>
        <Box paddingX={1}><Text color="white" dimColor>2</Text></Box>
        <Box paddingX={1}><Text color="white" dimColor>API KEY</Text></Box>
        <Text color="white" dimColor>───</Text>
        <Box paddingX={1}><Text color="white" dimColor>3</Text></Box>
        <Box paddingX={1}><Text color="white" dimColor>MODEL</Text></Box>
      </Box>

      {/* Bordered input panel */}
      <Box
        flexDirection="column"
        alignItems="center"
        borderStyle="bold"
        borderColor={error ? 'red' : 'cyan'}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="row" alignItems="center" marginBottom={1}>
          <Text color="black" backgroundColor={error ? 'red' : 'cyan'} bold>  WHO ARE YOU?  </Text>
        </Box>
        <Box flexDirection="row" alignItems="center" marginBottom={1}>
          <Text color={error ? 'red' : 'cyan'} bold>›  </Text>
          <TextInput
            value={value}
            onChange={(v) => { setValue(v); setError(''); }}
            onSubmit={handleSubmit}
            placeholder="Enter your name"
          />
        </Box>
        <Box height={1}>
          {error
            ? <Text color="red" bold>✗ {error}</Text>
            : <Text color="white" dimColor>Will be used to personalize your local session.</Text>
          }
        </Box>
      </Box>

      {/* Keyboard hint */}
      <Box marginTop={2} flexDirection="row" alignItems="center">
        <Text color="white" dimColor>Press </Text>
        <Text color="black" backgroundColor="white" bold> Enter </Text>
        <Text color="white" dimColor> to continue</Text>
      </Box>
      </Box>
    </Box>
  );
}
