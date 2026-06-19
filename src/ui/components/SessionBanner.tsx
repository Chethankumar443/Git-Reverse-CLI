// ─────────────────────────────────────────────────────────────
//  git-reverse — Session Banner
//  Styled saved session notification with resume command
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';

interface SessionBannerProps {
  sessionId: string;
  repoUrl?: string;
}

export function SessionBanner({ sessionId, repoUrl }: SessionBannerProps) {
  const label = repoUrl && repoUrl !== 'chat'
    ? repoUrl.replace('https://github.com/', '')
    : repoUrl === 'chat'
    ? 'General Chat'
    : '';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="green"
      paddingX={1}
      paddingY={0}
      marginTop={1}
      marginLeft={0}
      marginBottom={1}
    >
      {/* Title bar */}
      <Box flexDirection="row" alignItems="center" marginBottom={0}>
        <Text color="black" backgroundColor="green"> ✓ SESSION SAVED </Text>
        {label && (
          <>
            <Text color="green" dimColor>  ·  </Text>
            <Text color="white" dimColor>{label}</Text>
          </>
        )}
      </Box>

      {/* Session ID */}
      <Box flexDirection="row" alignItems="center">
        <Text color="white" dimColor>ID  </Text>
        <Text color="black" backgroundColor="cyan"> #{sessionId} </Text>
      </Box>

      {/* Resume hint */}
      <Box flexDirection="row" alignItems="center" marginTop={0}>
        <Text color="white" dimColor>Resume  </Text>
        <Text color="cyan">git-reverse --resume {sessionId}</Text>
      </Box>
    </Box>
  );
}
