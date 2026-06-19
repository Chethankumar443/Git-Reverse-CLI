// ─────────────────────────────────────────────────────────────
//  git-reverse — Header Component
//  ASCII logo + status strip + greeting
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

      {/* ── Status strip ─────────────────────────────────────── */}
      <Box marginTop={1} flexDirection="row" alignItems="center">
        {/* Version pill */}
        <Text color="black" backgroundColor="cyan"> v{version} </Text>

        {/* Model tag */}
        {model && (
          <>
            <Text color="cyan" dimColor>  ·  </Text>
            <Text color="white" dimColor>{formatModelProvider(model)}/</Text>
            <Text color="cyan" bold>{formatModelId(model)}</Text>
          </>
        )}

        {/* New model alert tag */}
        {newModelCount > 0 && (
          <>
            <Text color="cyan" dimColor>  ·  </Text>
            <Text color="black" backgroundColor="green"> ↑ {newModelCount} new model{newModelCount > 1 ? 's' : ''} </Text>
          </>
        )}
      </Box>

      {/* ── Greeting ─────────────────────────────────────────── */}
      {username && (
        <Box marginTop={0} paddingLeft={2}>
          <Text color="white" dimColor>Hello, </Text>
          <Text color="white" bold>{username}</Text>
          <Text color="cyan"> ◂</Text>
        </Box>
      )}

      {/* ── Divider ──────────────────────────────────────────── */}
      <Box marginTop={1}>
        <Text color="cyan" dimColor>{'╾' + '─'.repeat(77) + '╼'}</Text>
      </Box>
    </Box>
  );
}
