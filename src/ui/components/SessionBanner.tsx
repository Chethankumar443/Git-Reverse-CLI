// ─────────────────────────────────────────────────────────────
//  git-reverse — Session Banner
//  Shows session ID prominently on exit
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';

interface SessionBannerProps {
  sessionId: string;
  repoUrl?: string;
}

export function SessionBanner({ sessionId, repoUrl }: SessionBannerProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="white"
      paddingX={2}
      paddingY={0}
      marginTop={1}
      marginLeft={2}
    >
      <Text color="white" dimColor>
        Session saved
      </Text>
      <Box flexDirection="row" gap={1}>
        <Text color="white" dimColor>
          ID:
        </Text>
        <Text color="cyan">{sessionId}</Text>
      </Box>
      {repoUrl && (
        <Text color="white" dimColor>
          {repoUrl}
        </Text>
      )}
      <Box marginTop={0}>
        <Text color="white" dimColor>
          Resume: {'  '}
        </Text>
        <Text color="yellow">git-reverse --resume {sessionId}</Text>
      </Box>
    </Box>
  );
}
