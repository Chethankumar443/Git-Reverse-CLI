// ─────────────────────────────────────────────────────────────
//  git-reverse — Notification Banner
//  Shows new free model alerts
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';
import type { OpenRouterModel } from '../../types/index.js';
import { formatModelId, formatModelProvider } from '../../utils/format.js';

interface NotificationProps {
  newModels: OpenRouterModel[];
  onDismiss?: () => void;
}

export function Notification({ newModels }: NotificationProps) {
  if (newModels.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="green"
      paddingX={2}
      paddingY={0}
      marginBottom={1}
      marginLeft={2}
    >
      <Text color="green">
        ↑ {newModels.length} new free model{newModels.length > 1 ? 's' : ''} on OpenRouter
      </Text>
      {newModels.slice(0, 3).map((m) => (
        <Text key={m.id} color="white" dimColor>
          {'  '}
          {formatModelProvider(m.id)}/{formatModelId(m.id)}
          {'  '}
          <Text color="white" dimColor>
            {m.context_length ? `${(m.context_length / 1000).toFixed(0)}k ctx` : ''}
          </Text>
        </Text>
      ))}
      {newModels.length > 3 && (
        <Text color="white" dimColor>
          {'  '}+{newModels.length - 3} more · run \settings to view all
        </Text>
      )}
    </Box>
  );
}
