// ─────────────────────────────────────────────────────────────
//  git-reverse — Resume Session Screen
//  Shows recent sessions, allows resume by ID
// ─────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { SessionManager } from '../../core/SessionManager.js';

import type { Session, AnalysisMode } from '../../types/index.js';
import { timeAgo } from '../../utils/format.js';

interface ResumeSessionProps {
  initialId?: string;
  onResume: (session: Session) => void;
  onBack: () => void;
}

export function ResumeSession({ initialId = '', onResume, onBack }: ResumeSessionProps) {
  const [idValue, setIdValue] = useState(initialId);
  const [error, setError] = useState('');
  const recentSessions = SessionManager.listSessions().slice(0, 8);

  // Stable identity across renders — prevents Ink's useInput effect from
  // tearing down/re-registering and dropping keypresses.
  const handleKey = useCallback(
    (_: string, key: { escape: boolean }) => {
      if (key.escape) onBack();
    },
    [onBack],
  );

  useInput(handleKey);



  const handleSubmit = (val: string) => {
    const id = val.trim().replace(/^#/, '');
    if (!id) { setError('Enter a session ID.'); return; }
    const session = SessionManager.getSession(id);
    if (!session) { setError(`No session found with ID: ${id}`); return; }
    onResume(session);
  };

  return (
    <Box flexGrow={1} justifyContent="center" alignItems="center" flexDirection="column" width="100%">
      <Box flexDirection="column" alignItems="center">
        <Box marginBottom={1}>
        <Text color="cyan">Resume Session</Text>
      </Box>

      <Box marginBottom={1} flexDirection="column" alignItems="center">
        <Text color="white" dimColor>Enter a session ID to resume:</Text>
        <Box marginTop={1}>
          <Text color="white" dimColor>{'  id  '}</Text>
          <TextInput
            value={idValue}
            onChange={(v) => { setIdValue(v); setError(''); }}
            onSubmit={handleSubmit}
            placeholder="e.g. abc12345"
          />
        </Box>
        {error && (
          <Box marginTop={1}>
            <Text color="red">{'  '}{error}</Text>
          </Box>
        )}
      </Box>

      {recentSessions.length > 0 && (
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          <Box>
            <Text color="white" dimColor>{'  '}{'─'.repeat(44)}</Text>
          </Box>
          <Text color="white" dimColor>Saved sessions:</Text>
          <Box flexDirection="column" marginTop={0} alignItems="center">
            {recentSessions.map((s) => (
              <Box key={s.id} flexDirection="row">
                <Text color="cyan">#{s.id}{'  '}</Text>
                <Text color="white" dimColor>
                  {s.repoUrl.replace('https://github.com/', '').slice(0, 28).padEnd(30)}
                </Text>
                <Text color="white" dimColor>
                  {s.mode !== 'standard' ? `[${s.mode}]  ` : '          '}
                </Text>
                <Text color="white" dimColor>{timeAgo(s.updatedAt)}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="white" dimColor>Esc to go back</Text>
        </Box>
      </Box>
    </Box>
  );
}
