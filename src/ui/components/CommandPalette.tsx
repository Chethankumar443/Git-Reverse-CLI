// ─────────────────────────────────────────────────────────────
//  git-reverse — Command Palette Overlay
//  Rich floating panel — triggered by pressing \ or /
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';
import type { CommandEntry } from '../../types/index.js';

const COMMANDS: CommandEntry[] = [
  {
    name: 'settings',
    aliases: ['\\settings'],
    description: 'Open settings — API key, model, username',
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
    aliases: ['\\compact'],
    description: 'Summarize the current session',
    hint: 'compact',
  },
  {
    name: 'deepdive',
    aliases: ['\\deepdive'],
    description: 'Detailed deep-dive mode output',
    hint: 'deepdive',
  },
  {
    name: 'resume',
    aliases: ['\\resume <id>'],
    description: 'Resume a previous session by ID',
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
    description: 'Clear the output buffer',
    hint: 'clear',
  },
  {
    name: 'quit',
    aliases: ['\\quit'],
    description: 'Save session and exit',
    hint: 'quit',
  },
];

// Icon map per command
const ICONS: Record<string, string> = {
  settings: '⚙',
  update:   '↑',
  compact:  '◈',
  deepdive: '⬡',
  resume:   '↺',
  sessions: '☰',
  clear:    '✕',
  quit:     '⏻',
};

interface CommandPaletteProps {
  visible: boolean;
}

export function CommandPalette({ visible }: CommandPaletteProps) {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
      marginBottom={1}
      marginLeft={2}
    >
      {/* Title bar */}
      <Box flexDirection="row" alignItems="center" marginBottom={0}>
        <Text color="black" backgroundColor="cyan"> COMMANDS </Text>
        <Text color="cyan" dimColor> ─────────────────────────────────────</Text>
      </Box>

      {/* Command rows */}
      {COMMANDS.map((cmd) => (
        <Box key={cmd.name} flexDirection="row" marginTop={0}>
          {/* Icon */}
          <Box width={3}>
            <Text color="cyan" dimColor>{ICONS[cmd.name] ?? '›'}</Text>
          </Box>
          {/* Shortcut tag */}
          <Box width={20}>
            <Text color="cyan" bold>{cmd.aliases[0]}</Text>
          </Box>
          {/* Description */}
          <Text color="white" dimColor>{cmd.description}</Text>
        </Box>
      ))}

      {/* Footer */}
      <Box marginTop={0} flexDirection="row" alignItems="center">
        <Text color="cyan" dimColor>──────────────────────────────────────────</Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        <Text color="white" dimColor>  Press </Text>
        <Text color="black" backgroundColor="white"> Esc </Text>
        <Text color="white" dimColor> to close</Text>
      </Box>
    </Box>
  );
}

export { COMMANDS };
