// ─────────────────────────────────────────────────────────────
//  git-reverse — Dashboard Screen
// ─────────────────────────────────────────────────────────────

import React, { useState, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { CommandPalette } from '../components/CommandPalette.js';
import { Notification } from '../components/Notification.js';
import { SessionBanner } from '../components/SessionBanner.js';
import type { OpenRouterModel, AnalysisMode } from '../../types/index.js';
import { parseGitHubInput, isGitHubUrl, isLocalPath } from '../../utils/github.js';
import { formatModelId, timeAgo } from '../../utils/format.js';
import { SessionManager } from '../../core/SessionManager.js';
import { execSync } from 'node:child_process';

interface DashboardProps {
  username: string;
  model: string;
  newModels: OpenRouterModel[];
  sessionId?: string | null;
  sessionRepoUrl?: string | null;
  onAnalyze: (repoUrl: string, query: string, mode: AnalysisMode) => void;
  onCommand: (command: string) => void;
  onSessionBannerDismiss?: () => void;
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

export function Dashboard({ username, model, newModels, sessionId, sessionRepoUrl, onAnalyze, onCommand, onSessionBannerDismiss }: DashboardProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('standard');
  const [tuiMode, setTuiMode] = useState<'reverse' | 'explore'>('reverse');

  const recentSessions = SessionManager.listSessions().slice(0, 3);

  // ── Stable refs for the useInput callback ──────────────────
  // Prevents the useInput effect from re-registering on every state change,
  // which would cycle setRawMode(false)/setRawMode(true) and drop keystrokes on Windows.
  const showPaletteRef = useRef(showPalette);
  showPaletteRef.current = showPalette;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;
  const tuiModeRef = useRef(tuiMode);
  tuiModeRef.current = tuiMode;
  const onSessionBannerDismissRef = useRef(onSessionBannerDismiss);
  onSessionBannerDismissRef.current = onSessionBannerDismiss;

  // Stable callback — never changes identity, so useInput effect never re-runs.
  const stableInputHandler = useCallback((input: string, key: { escape: boolean; tab: boolean; return: boolean; }) => {
    if (key.escape && showPaletteRef.current) {
      setShowPalette(false);
      return;
    }
    if (key.escape && sessionIdRef.current) {
      onSessionBannerDismissRef.current?.();
      return;
    }
    // Only intercept \ and Tab when the text input is empty.
    if (inputValueRef.current === '') {
      if ((input === '\\' || input === '/') && !showPaletteRef.current) {
        if (sessionIdRef.current) onSessionBannerDismissRef.current?.();
        setShowPalette(true);
        setInputValue(input);
        return;
      }
      if (key.tab) {
        setTuiMode(prev => prev === 'reverse' ? 'explore' : 'reverse');
        return;
      }
    }
  }, []);

  useInput(stableInputHandler);

  const handleSubmit = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    // Dismiss session banner on new action
    if (sessionId) onSessionBannerDismiss?.();

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

    // Chat fallback: not a URL or local path — treat as general chat session
    setError('');
    onAnalyze('chat', trimmed, mode);
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


  const handleBannerSubmit = () => {
    onSessionBannerDismiss?.();
    setInputValue('');
  };

  // Mode label and color for display
  const modeLabel = tuiMode === 'reverse' ? 'REVERSE' : 'EXPLORE';
  const modeBg    = tuiMode === 'reverse' ? 'cyan' : 'yellow';

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {newModels.length > 0 && <Notification newModels={newModels} />}

      {sessionId && (
        <SessionBanner sessionId={sessionId} repoUrl={sessionRepoUrl ?? undefined} />
      )}

      <CommandPalette visible={showPalette} />

      {/* ── Mode status badges ──────────────────── */}
      {(mode === 'deep' || mode === 'compact') && (
        <Box marginBottom={1} flexDirection="row" alignItems="center">
          <Text color="black"
                backgroundColor={mode === 'deep' ? 'yellow' : 'green'}>
            {' '}{mode === 'deep' ? '⬡ DEEP-DIVE' : '◈ COMPACT'}{' '}
          </Text>
          <Text color="white" dimColor>
            {mode === 'deep'
              ? '  14-section analysis with pitfalls, learning path, time estimate'
              : '  600-word condensed blueprint with quick-start steps'}
          </Text>
        </Box>
      )}

      {/* ── Input prompt ───────────────────────────────────── */}
      <Box marginBottom={0}>
        <Text color="white" dimColor>
          {'  '}Paste a GitHub URL, local path, or ask a question.
        </Text>
      </Box>

      {/* ── Bordered input panel ───────────────────────────── */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={error ? 'red' : 'cyan'}
        paddingX={1}
        marginLeft={0}
        marginTop={0}
      >
        {/* Mode tag inside border */}
        <Box flexDirection="row" alignItems="center" marginBottom={0}>
          <Text color="black" backgroundColor={modeBg}> {modeLabel} </Text>
          <Text color="cyan" dimColor>  </Text>
          <Text color="white" dimColor>
            {tuiMode === 'reverse'
              ? 'architecture synthesizer — outputs Master Prompt blueprint'
              : 'codebase walkthrough — explains how it works'}
          </Text>
        </Box>

        {/* Text input row */}
        <Box flexDirection="row" alignItems="center">
          <Text color="cyan" bold>{'› '}</Text>
          <TextInput
            value={inputValue}
            onChange={(v) => {
              setInputValue(v);
              setError('');
              if (sessionId && v.length > 0) onSessionBannerDismiss?.();
            }}
            onSubmit={handleSubmit}
            placeholder={
              tuiMode === 'reverse'
                ? 'github.com/owner/repo  — or  ./local-path  — or add a query after the URL'
                : 'Ask anything about architecture, or paste a repo URL to explore'
            }
          />
        </Box>

        {/* Error / status row — fixed height */}
        <Box height={1}>
          {error ? (
            <Text color="red">✗ {error}</Text>
          ) : (
            <Text color="white" dimColor> </Text>
          )}
        </Box>
      </Box>

      {/* ── Keybind hints ─────────────────────────────────── */}
      <Box marginTop={1} flexDirection="row" alignItems="center">
        <Text color="white" dimColor>  </Text>
        <Text color="black" backgroundColor="white"> Enter </Text>
        <Text color="white" dimColor> submit  </Text>
        <Text color="black" backgroundColor="white"> \ </Text>
        <Text color="white" dimColor> commands  </Text>
        <Text color="black" backgroundColor="white"> Tab </Text>
        <Text color="white" dimColor> switch mode</Text>
      </Box>

      {/* ── Recent sessions ───────────────────────────────── */}
      {recentSessions.length > 0 && (
        <Box flexDirection="column" marginTop={2}>
          <Box marginBottom={0}>
            <Text color="cyan" dimColor>{'╾' + '─'.repeat(44) + '╼'}</Text>
          </Box>
          <Box marginBottom={0}>
            <Text color="white" bold>{'  '}Recent Sessions</Text>
          </Box>
          {recentSessions.map((s, idx) => (
            <Box key={s.id} flexDirection="row" paddingLeft={2} alignItems="center">
              {/* Index badge */}
              <Text color="black" backgroundColor="cyan"> {idx + 1} </Text>
              <Text color="white" dimColor>  </Text>
              {/* Repo/chat label */}
              <Text color="white">
                {s.repoUrl === 'chat'
                  ? 'General Chat'
                  : s.repoUrl.replace('https://github.com/', '')}
              </Text>
              <Text color="white" dimColor>  </Text>
              {/* Time ago */}
              <Text color="cyan" dimColor>{timeAgo(s.updatedAt)}</Text>
              <Text color="white" dimColor>  #</Text>
              <Text color="cyan" dimColor>{s.id}</Text>
            </Box>
          ))}
          <Box marginTop={0} paddingLeft={2}>
            <Text color="white" dimColor>Type </Text>
            <Text color="cyan">\resume {'<id>'}</Text>
            <Text color="white" dimColor> to continue a session</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
