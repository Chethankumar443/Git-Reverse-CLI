// ─────────────────────────────────────────────────────────────
//  git-reverse — Dashboard Screen
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { CommandPalette } from '../components/CommandPalette.js';
import { Notification } from '../components/Notification.js';
import type { OpenRouterModel, AnalysisMode } from '../../types/index.js';
import { parseGitHubInput, isGitHubUrl, isLocalPath } from '../../utils/github.js';
import { formatModelId, timeAgo } from '../../utils/format.js';
import { SessionManager } from '../../core/SessionManager.js';
import { execSync } from 'node:child_process';

interface DashboardProps {
  username: string;
  model: string;
  newModels: OpenRouterModel[];
  onAnalyze: (repoUrl: string, query: string, mode: AnalysisMode) => void;
  onCommand: (command: string) => void;
}

function parseLocalInput(input: string): { path: string; query: string } {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const first = parts[0] || '';
  if (isLocalPath(first)) {
    return { path: first, query: parts.slice(1).join(' ') };
  }
  return { path: trimmed, query: '' };
}

export function Dashboard({ username, model, newModels, onAnalyze, onCommand }: DashboardProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('standard');
  const [tuiMode, setTuiMode] = useState<'reverse' | 'explore'>('reverse');

  const recentSessions = SessionManager.listSessions().slice(0, 3);

  useInput((input, key) => {
    if (key.escape && showPalette) {
      setShowPalette(false);
      return;
    }
    if ((input === '\\' || input === '/') && !showPalette) {
      setShowPalette(true);
      return;
    }
    if (key.tab) {
      setTuiMode(tuiMode === 'reverse' ? 'explore' : 'reverse');
    }
  });

  const handleSubmit = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    // Handle commands
    if (trimmed.startsWith('\\') || trimmed.startsWith('/')) {
      handleCommand(trimmed);
      return;
    }

    const { parsed, query } = parseGitHubInput(trimmed);
    if (parsed) {
      setError('');
      onAnalyze(parsed.raw, query, tuiMode === 'explore' ? 'explore' : mode);
      return;
    }

    // Check if local path
    const firstWord = trimmed.split(/\s+/)[0] || '';
    if (isLocalPath(firstWord)) {
      const { path, query: localQuery } = parseLocalInput(trimmed);
      setError('');
      onAnalyze(path, localQuery, tuiMode === 'explore' ? 'explore' : mode);
      return;
    }

    // Chat fallback: If not a URL or local path, treat as general chat session
    setError('');
    onAnalyze('chat', trimmed, 'explore');
  };

  const handleCommand = (cmd: string) => {
    let normalized = cmd.trim();
    if (normalized.startsWith('/')) {
      normalized = '\\' + normalized.slice(1);
    }
    const lower = normalized.toLowerCase().trim();
    setShowPalette(false);
    setInputValue('');

    if (lower === '\\update') {
      console.clear();
      console.log('\n  ⠋ Checking for updates and installing latest version...\n');
      try {
        execSync('npm install -g git-reverse-cli@latest', { stdio: 'inherit' });
        console.log('\n  ✔ Successfully updated to the latest version!');
        console.log('  Please restart the CLI by typing `git-reverse` to use the new version.\n');
        process.exit(0);
      } catch (err) {
        console.log('\n  ✖ Failed to update automatically.');
        console.log('  Please run this command manually: npm install -g git-reverse-cli@latest\n');
      }
      return;
    }

    if (lower === '\\settings') return onCommand('settings');
    if (lower === '\\compact' || lower === '\\summarize') {
      setMode('compact');
      setInputValue('');
      return;
    }
    if (lower === '\\deepdive' || lower === '\\learn') {
      setMode('deep');
      setInputValue('');
      return;
    }
    if (lower === '\\sessions') return onCommand('sessions');
    if (lower === '\\clear') return onCommand('clear');
    if (lower.startsWith('\\resume ')) {
      const id = lower.slice(8).trim();
      return onCommand(`resume:${id}`);
    }
    if (lower === '\\quit' || lower === '\\exit') return onCommand('quit');

    setError(`Unknown command: ${cmd}. Press \\ to see all commands.`);
  };

  const detectMode = (query: string): AnalysisMode => {
    if (mode === 'deep') return 'deep';
    const lower = query.toLowerCase();
    if (/deep.?dive|in.?depth|detailed|understand|learn|explain/.test(lower)) return 'deep';
    return 'standard';
  };

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {newModels.length > 0 && <Notification newModels={newModels} />}

      <CommandPalette visible={showPalette} />

      {mode === 'deep' && (
        <Box marginBottom={1}>
          <Text color="yellow">  ◈ Deep-dive mode active</Text>
          <Text color="white" dimColor>  — detailed educational output</Text>
        </Box>
      )}

      {mode === 'compact' && (
        <Box marginBottom={1}>
          <Text color="green">  ◈ Compact mode active</Text>
          <Text color="white" dimColor>  — concise session summary</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text color="white" dimColor>
          {'  '}Paste a GitHub URL, local path, or ask a question.
        </Text>
      </Box>

      <Box flexDirection="column">
        <Box>
          <Text color="cyan" dimColor>
            {'  › '}
          </Text>
          <TextInput
            value={inputValue}
            onChange={(v) => {
              setInputValue(v);
              setError('');
            }}
            onSubmit={handleSubmit}
            placeholder={
              tuiMode === 'reverse'
                ? "https://github.com/owner/repo or local path [rebuild prompt]"
                : "Ask a general question or paste a repo to explore"
            }
          />
        </Box>

        {/* Locked status row: always occupies exactly 1 line to prevent layout shifting */}
        <Box height={1} marginTop={1}>
          {error ? (
            <Text color="red">{'  '}✗ {error}</Text>
          ) : (
            <Text color="white" dimColor>
              {'  '}Ready in {tuiMode === 'reverse' ? 'Reverse Mode (creates build instructions)' : 'Explore Mode (codebase explanation)'}
            </Text>
          )}
        </Box>

        <Box marginTop={1} flexDirection="row" justifyContent="space-between" width={80}>
          <Box>
            <Text color="white" dimColor>
              {'  '}Enter to submit · \ or / for commands
            </Text>
          </Box>
          <Box marginRight={2}>
            <Text color="white" dimColor>Mode: </Text>
            <Text color={tuiMode === 'reverse' ? 'cyan' : 'yellow'} bold>
              {tuiMode === 'reverse' ? 'Reverse 🛠️' : 'Explore 🔍'}
            </Text>
            <Text color="white" dimColor> (Tab to switch)</Text>
          </Box>
        </Box>
      </Box>

      {recentSessions.length > 0 && (
        <Box flexDirection="column" marginTop={2}>
          <Box marginBottom={0}>
            <Text color="white" dimColor>
              {'  '}{'─'.repeat(44)}
            </Text>
          </Box>
          <Text color="white" dimColor>
            {'  '}Recent sessions
          </Text>
          {recentSessions.map((s) => (
            <Box key={s.id} flexDirection="row" paddingLeft={2}>
              <Text color="cyan" dimColor>
                #{s.id}{'  '}
              </Text>
              <Text color="white" dimColor>
                {s.repoUrl === 'chat' ? 'General Chat' : s.repoUrl.replace('https://github.com/', '')}
              </Text>
              <Text color="white" dimColor>
                {'  '}{timeAgo(s.updatedAt)}
              </Text>
            </Box>
          ))}
          <Text color="white" dimColor>
            {'  '}\resume {'<id>'} to continue
          </Text>
        </Box>
      )}
    </Box>
  );
}
