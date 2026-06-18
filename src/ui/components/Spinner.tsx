// ─────────────────────────────────────────────────────────────
//  git-reverse — Spinner Component
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  label: string;
  color?: string;
}

export function Spinner({ label, color = 'cyan' }: SpinnerProps) {
  return (
    <Box paddingLeft={2}>
      <Text color={color as Parameters<typeof Text>[0]['color']}>
        <InkSpinner type="dots" />
      </Text>
      <Text color="white" dimColor>
        {'  '}
        {label}
      </Text>
    </Box>
  );
}
