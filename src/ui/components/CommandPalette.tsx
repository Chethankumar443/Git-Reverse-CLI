// ─────────────────────────────────────────────────────────────
//  git-reverse — Command Palette Overlay
//  Triggered by pressing backslash '\'
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';
import type { CommandEntry } from '../../types/index.js';

const COMMANDS: CommandEntry[] = [
  {
    name: 'settings',
    aliases: ['\\settings'],
    description: 'to open settings page for any modification',
    hint: 'settings',
  },
  {
    name: 'update',
    aliases: ['\\update'],
    description: 'Update to the latest version',
    hint: 'update',
  },
  {
    name: 'compact',
    aliases: ['\\compact', '\\summarize'],
    description: 'to summarize the session',
    hint: 'compact',
  },
  {
    name: 'deepdive',
    aliases: ['\\deepdive', '\\learn'],
    description: 'for deeply analyzing and giving a very detailed prompt in such a way that user can understand and also the following prompt can be used the same project from scratch according to the user',
    hint: 'deepdive',
  },
  {
    name: 'resume',
    aliases: ['\\resume <id>'],
    description: 'Resume a previous session by its ID',
    hint: 'resume',
  },
  {
    name: 'sessions',
    aliases: ['\\sessions'],
    description: 'List all saved sessions',
    hint: 'sessions',
  },
  {
    name: 'clear',
    aliases: ['\\clear'],
    description: 'Clear the current output buffer',
    hint: 'clear',
  },
  {
    name: 'quit',
    aliases: ['\\quit', '\\exit'],
    description: 'Save session and exit',
    hint: 'quit',
  },
];

interface CommandPaletteProps {
  visible: boolean;
}

export function CommandPalette({ visible }: CommandPaletteProps) {
  if (!visible) return null;

  const COL1 = 24;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={2}
      paddingY={0}
      marginBottom={1}
      marginLeft={2}
    >
      <Text color="cyan" dimColor>
        Commands
      </Text>
      <Box marginTop={0}>
        <Text color="white" dimColor>
          {'─'.repeat(40)}
        </Text>
      </Box>
      {COMMANDS.map((cmd) => (
        <Box key={cmd.name} flexDirection="row">
          <Box width={COL1}>
            <Text color="cyan">
              {cmd.aliases.join(', ')}
            </Text>
          </Box>
          <Box>
            <Text color="white" dimColor>
              {cmd.description}
            </Text>
          </Box>
        </Box>
      ))}
      <Box marginTop={0}>
        <Text color="white" dimColor>
          {'─'.repeat(40)}
        </Text>
      </Box>
      <Text color="white" dimColor>
        esc  close palette
      </Text>
    </Box>
  );
}

export { COMMANDS };
