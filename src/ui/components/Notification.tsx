// ─────────────────────────────────────────────────────────────
//  git-reverse — Notification Banner
//  Styled new free model alert card
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';
import type { OpenRouterModel } from '../../types/index.js';
import { formatModelId, formatModelProvider } from '../../utils/format.js';

interface NotificationProps {
  newModels: OpenRouterModel[];
}

export function Notification({ newModels }: NotificationProps) {
  if (newModels.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="bold"
      borderColor="green"
      paddingX={2}
      paddingY={1}
      marginBottom={1}
      marginLeft={2}
      width={60}
    >
      {/* Title bar */}
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text color="black" backgroundColor="green" bold>  ↑ NEW MODELS  </Text>
        <Box marginLeft={1}>
          <Text color="green"> {newModels.length} free model{newModels.length > 1 ? 's' : ''} on OpenRouter</Text>
        </Box>
      </Box>

      {/* Model rows */}
      {newModels.slice(0, 3).map((m) => (
        <Box key={m.id} flexDirection="row" alignItems="center" paddingLeft={1}>
          <Box width={3}>
            <Text color="green" bold>›</Text>
          </Box>
          <Box width={15}>
            <Text color="white" dimColor>{formatModelProvider(m.id)}</Text>
          </Box>
          <Box width={2}>
            <Text color="white" dimColor>/</Text>
          </Box>
          <Box flexGrow={1}>
            <Text color="cyan">{formatModelId(m.id)}</Text>
          </Box>
          {m.context_length ? (
            <Box>
              <Text color="white" dimColor>{(m.context_length / 1000).toFixed(0)}k ctx</Text>
            </Box>
          ) : null}
        </Box>
      ))}

      {/* Overflow hint */}
      {newModels.length > 3 && (
        <Box flexDirection="row" alignItems="center" marginTop={1} paddingLeft={1}>
          <Text color="white" dimColor>+{newModels.length - 3} more  ·  type </Text>
          <Text color="cyan">\\settings</Text>
          <Text color="white" dimColor> to view all</Text>
        </Box>
      )}
    </Box>
  );
}
