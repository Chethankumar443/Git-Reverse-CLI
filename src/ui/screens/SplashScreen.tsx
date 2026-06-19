import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

const LOGO = [
  ' ██████╗ ██╗████████╗      ██████╗ ███████╗██╗   ██╗███████╗██████╗ ███████╗███████╗',
  '██╔════╝ ██║╚══██╔══╝      ██╔══██╗██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝',
  '██║  ███╗██║   ██║         ██████╔╝█████╗  ██║   ██║█████╗  ██████╔╝███████╗█████╗  ',
  '██║   ██║██║   ██║         ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝  ',
  '╚██████╔╝██║   ██║         ██║  ██║███████╗ ╚████╔╝ ███████╗██║  ██║███████║███████╗',
  ' ╚═════╝ ╚═╝   ╚═╝         ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝',
];

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useInput((input, key) => {
    if (key.return) {
      onComplete();
    }
  });

  return (
    <Box flexGrow={1} justifyContent="center" alignItems="center" flexDirection="column" width="100%">
      <Box flexDirection="column">
        <Box justifyContent="center" marginBottom={1}>
          <Text color="yellow" bold> </Text>
        </Box>

        {LOGO.map((line, i) => (
          <Box key={i} justifyContent="center">
            <Text color="cyan" bold>{line}</Text>
          </Box>
        ))}

        <Box justifyContent="center" marginTop={2} marginBottom={1}>
          <Text>🎮 </Text>
          <Text color="magenta" bold>Git Reverse Architecture Synthesizer</Text>
          <Text> 🎮</Text>
        </Box>

        <Box justifyContent="center" marginBottom={1}>
          <Text color="cyan" dimColor>{'─'.repeat(45)}</Text>
        </Box>

        <Box justifyContent="center" marginBottom={2}>
          <Text color="white">Developed by: </Text>
          <Text color="green" bold underline>Chethan Kumar Jagadish Ulavi</Text>
        </Box>

        <Box justifyContent="center">
          <Text color="white" dimColor>[ Press ENTER to continue ]</Text>
        </Box>
      </Box>
    </Box>
  );
}
