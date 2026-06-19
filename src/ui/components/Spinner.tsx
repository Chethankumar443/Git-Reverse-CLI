// ─────────────────────────────────────────────────────────────
//  git-reverse — Spinner Component
//  Styled progress indicator with step badge
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  label: string;
  color?: string;
  step?: string;
}

export function Spinner({ label, color = 'cyan', step }: SpinnerProps) {
  return (
    <Box paddingLeft={2} paddingY={0} alignItems="center">
      {/* Step badge (optional) */}
      {step && (
        <Box marginRight={1}>
          <Text color="black" backgroundColor={color as any} bold> {step} </Text>
        </Box>
      )}
      {/* Spinner dots */}
      <Text color={color as any} bold>
        <InkSpinner type="dots" />
      </Text>
      {/* Label */}
      <Box marginLeft={1}>
        <Text color="white" dimColor>{label}</Text>
      </Box>
    </Box>
  );
}
