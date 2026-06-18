// ─────────────────────────────────────────────────────────────
//  git-reverse — Header Component
//  ASCII logo + username greeting + active model badge
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';
import { formatModelId, formatModelProvider } from '../../utils/format.js';

interface HeaderProps {
  username?: string;
  model?: string;
  version?: string;
  newModelCount?: number;
}

const LOGO = [
  ' ██████╗ ██╗████████╗      ██████╗ ███████╗██╗   ██╗███████╗██████╗ ███████╗███████╗',
  '██╔════╝ ██║╚══██╔══╝      ██╔══██╗██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝',
  '██║  ███╗██║   ██║         ██████╔╝█████╗  ██║   ██║█████╗  ██████╔╝███████╗█████╗  ',
  '██║   ██║██║   ██║         ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝  ',
  '╚██████╔╝██║   ██║         ██║  ██║███████╗ ╚████╔╝ ███████╗██║  ██║███████║███████╗',
  ' ╚═════╝ ╚═╝   ╚═╝         ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝',
];

export function Header({ username, model, version = '1.0.0', newModelCount = 0 }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {LOGO.map((line, i) => (
        <Text key={i} color="cyan" bold={i < 4} dimColor={i >= 4}>
          {line}
        </Text>
      ))}

      <Box marginTop={1} flexDirection="row" gap={2}>
        <Text color="white" dimColor>
          {'  '}v{version}
        </Text>
        {model && (
          <Box>
            <Text color="white" dimColor>
              {'·'}
            </Text>
            <Text color="yellow" dimColor>
              {' '}
              {formatModelProvider(model)}
            </Text>
            <Text color="white" dimColor>
              /
            </Text>
            <Text color="yellow">{formatModelId(model)}</Text>
          </Box>
        )}
        {newModelCount > 0 && (
          <Box>
            <Text color="white" dimColor>
              {'·'}
            </Text>
            <Text color="green"> {newModelCount} new model{newModelCount > 1 ? 's' : ''} available</Text>
          </Box>
        )}
      </Box>

      {username && (
        <Box marginTop={0} paddingLeft={2}>
          <Text color="white" dimColor>
            Hello,{' '}
          </Text>
          <Text color="white">{username}.</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="white" dimColor>
          {'─'.repeat(79)}
        </Text>
      </Box>
    </Box>
  );
}
