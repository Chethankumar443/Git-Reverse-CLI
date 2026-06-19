// ─────────────────────────────────────────────────────────────
//  git-reverse — Splash Screen
//  ASCII logo + press-enter gate
//
//  ROOT CAUSE FIX: Ink's useInput includes the inputHandler
//  function reference in its useEffect dependency array.
//  Passing a new inline arrow on every render caused the
//  listener to tear-down/re-register constantly, creating a
//  window where ENTER keypresses were silently dropped.
//
//  Fix: stabilise the handler with useCallback so its identity
//  never changes, AND add a useRef guard so onComplete() fires
//  exactly once no matter what.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';

const LOGO = [
  ' ██████╗ ██╗████████╗      ██████╗ ███████╗██╗   ██╗███████╗██████╗ ███████╗███████╗',
  '██╔════╝ ██║╚══██╔══╝      ██╔══██╗██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝',
  '██║  ███╗██║   ██║         ██████╔╝█████╗  ██║   ██║█████╗  ██████╔╝███████╗█████╗  ',
  '██║   ██║██║   ██║         ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝  ',
  '╚██████╔╝██║   ██║         ██║  ██║███████╗ ╚████╔╝ ███████╗██║  ██║███████║███████╗',
  ' ╚═════╝ ╚═╝   ╚═╝         ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝',
];

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  // Guard: ensure onComplete fires exactly once regardless of
  // how many times the input handler fires (e.g. held-down Enter)
  const firedRef = useRef(false);

  // CRITICAL: useCallback with an empty dep-array gives this function
  // a stable identity across all re-renders of SplashScreen.
  // Ink's useInput effect will therefore never re-register, so no
  // keypress is ever dropped during a listener teardown window.
  const handleInput = useCallback(
    (_input: string, key: { return: boolean }) => {
      if (key.return && !firedRef.current) {
        firedRef.current = true;
        onComplete();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // intentionally omit `onComplete` — captured once via the ref guard
  );

  useInput(handleInput);

  return (
    <Box
      flexGrow={1}
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
      width="100%"
    >
      <Box flexDirection="column">
        {/* ASCII Logo */}
        {LOGO.map((line, i) => (
          <Box key={i} justifyContent="center">
            <Text color="cyan" bold>
              {line}
            </Text>
          </Box>
        ))}

        {/* Tagline */}
        <Box justifyContent="center" marginTop={2} marginBottom={1}>
          <Text color="magenta" bold>
            Git Reverse Architecture Synthesizer
          </Text>
        </Box>

        {/* Divider */}
        <Box justifyContent="center" marginBottom={1}>
          <Text color="cyan" dimColor>
            {'─'.repeat(45)}
          </Text>
        </Box>

        {/* Author credit */}
        <Box justifyContent="center" marginBottom={2}>
          <Text color="white">Developed by: </Text>
          <Text color="green" bold underline>
            Chethan Kumar Jagadish Ulavi
          </Text>
        </Box>

        {/* Press-enter hint — pulses via dimColor */}
        <Box justifyContent="center">
          <Text color="cyan" dimColor>
            [ Press{' '}
          </Text>
          <Text color="white" bold>
            ENTER
          </Text>
          <Text color="cyan" dimColor>
            {' '}to continue ]
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
