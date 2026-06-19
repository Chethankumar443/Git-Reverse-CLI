// ─────────────────────────────────────────────────────────────
//  git-reverse — Analysis Screen
//  Shows live streaming analysis output and supports continuous chat
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import clipboardy from 'clipboardy';
import { AnalysisService } from '../../core/AnalysisService.js';
import { OpenRouterClient } from '../../api/OpenRouterClient.js';
import { PromptBuilder } from '../../core/PromptBuilder.js';
import { SessionManager } from '../../core/SessionManager.js';
import { OutputRenderer } from '../components/OutputRenderer.js';
import { Spinner } from '../components/Spinner.js';
import type { AnalysisInput, RepoAnalysis, Message } from '../../types/index.js';
import { countWords } from '../../utils/format.js';

interface AnalysisScreenProps {
  input: AnalysisInput;
  onComplete: (output: string, sessionId: string) => void;
  onBack: () => void;
  onError: (msg: string) => void;
}

type UIPhase = 'running' | 'streaming' | 'followup-thinking' | 'followup-streaming' | 'done' | 'error';



export function AnalysisScreen({ input, onComplete, onBack, onError }: AnalysisScreenProps) {
  const [phase, setPhase] = useState<UIPhase>('running');
  const [progressMsg, setProgressMsg] = useState('Initializing...');
  const [stepBadge, setStepBadge] = useState<string | undefined>(undefined);
  const [streamingOutput, setStreamingOutput] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [repoMeta, setRepoMeta] = useState<RepoAnalysis['meta'] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionId, setSessionId] = useState('');
  const repoMetaRef = useRef<RepoAnalysis['meta'] | null>(null);
  const sessionRef = useRef(new SessionManager());
  const abortRef = useRef(false);
  // Shared accumulator across the initial run and follow-up turns.
  // Reset at the start of each streamed response so we only capture that turn.
  const accumRef = useRef('');
  // Input history for Up/Down arrow navigation
  const inputHistoryRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);

  // ── Stable refs for useInput — prevents raw mode cycling on Windows ──
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const stableInputHandler = useCallback((_: string, key: { escape: boolean; upArrow: boolean; downArrow: boolean; }) => {
    if (key.escape && (phaseRef.current === 'done' || phaseRef.current === 'streaming' || phaseRef.current === 'followup-streaming')) {
      onBackRef.current();
    }
    // Up/Down arrow for input history navigation (only in done phase)
    if (phaseRef.current === 'done') {
      if (key.upArrow) {
        const idx = Math.min(historyIdxRef.current + 1, inputHistoryRef.current.length - 1);
        if (idx >= 0) {
          historyIdxRef.current = idx;
          setFollowUpInput(inputHistoryRef.current[inputHistoryRef.current.length - 1 - idx]);
        }
        return;
      }
      if (key.downArrow) {
        const idx = historyIdxRef.current - 1;
        if (idx >= 0) {
          historyIdxRef.current = idx;
          setFollowUpInput(inputHistoryRef.current[inputHistoryRef.current.length - 1 - idx]);
        } else {
          historyIdxRef.current = -1;
          setFollowUpInput('');
        }
        return;
      }
    }
  }, []);

  useInput(stableInputHandler);

  useEffect(() => {
    abortRef.current = false;
    accumRef.current = '';
    setWordCount(0);

    // Check if we are resuming an existing session
    if (input.resumeSessionId) {
      const session = sessionRef.current.loadSession(input.resumeSessionId);
      if (session) {
        setSessionId(session.id);
        setRepoMeta(session.repoMeta ?? null);
        repoMetaRef.current = session.repoMeta ?? null;
        setMessages(session.messages);

        // Rebuild the full conversation text from messages for OutputRenderer
        const conversation = session.messages
          .filter((m) => m.role !== 'system')
          .map((m) => {
            const prefix = m.role === 'user' ? '**You:** ' : '**Agent:**\n';
            return `${prefix}${m.content}`;
          })
          .join('\n\n');
        accumRef.current = conversation;
        setStreamingOutput(conversation);
        setWordCount(countWords(conversation));
        setPhase('done');
      } else {
        setErrorMsg(`Session with ID #${input.resumeSessionId} not found.`);
        setPhase('error');
      }
      return;
    }

    // Otherwise, start a new analysis session
    const run = async () => {
      const service = new AnalysisService(input.apiKey, input.githubToken);

      try {
        // Reset accumulator BEFORE streaming starts (not inside the async callback)
        accumRef.current = '';
        setWordCount(0);
        setStreamingOutput('');

        let finalMessages: Message[] = [];
        const gen = service.analyze(input, (progress) => {
          if (abortRef.current) return;
          setProgressMsg(progress.message);
          if (progress.step) setStepBadge(progress.step);
          if (progress.repoMeta) {
            setRepoMeta(progress.repoMeta);
            repoMetaRef.current = progress.repoMeta;
          }
          if (progress.phase === 'streaming') {
            setPhase('streaming');
            // Do NOT reset accumRef here — race condition would drop first chunks
          }
          if (progress.messages) {
            finalMessages = progress.messages;
          }
        });

        for await (const chunk of gen) {
          if (abortRef.current) break;
          if (chunk.done) break;
          accumRef.current += chunk.content;
          setStreamingOutput(accumRef.current);
          setWordCount(countWords(accumRef.current));
        }

        if (abortRef.current) return;

        // Save session
        const session = sessionRef.current.createSession({
          repoUrl: input.repoUrl,
          query: input.query ?? '',
          model: input.model,
          mode: input.mode,
          repoMeta: repoMetaRef.current ?? undefined,
        });

        // Prepopulate with LLM prompt chain
        for (const m of finalMessages) {
          sessionRef.current.appendMessage(m);
        }

        sessionRef.current.setAnalysisOutput(accumRef.current);
        sessionRef.current.appendMessage({ role: 'assistant', content: accumRef.current });
        sessionRef.current.save();

        setSessionId(session.id);
        setMessages(sessionRef.current.getCurrent()?.messages ?? []);
        setPhase('done');

        if (input.autoCopy) {
          try {
            await clipboardy.write(accumRef.current);
          } catch (e) {
            // Ignore clipboard errors on headless CI
          }
        }

        onComplete(accumRef.current, session.id);
      } catch (err: unknown) {
        if (abortRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
        setPhase('error');
        onError(msg);
      }
    };

    run();

    return () => {
      abortRef.current = true;
    };
  }, []);

  const handleFollowUpSubmit = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setFollowUpInput('');
    inputHistoryRef.current.push(trimmed);
    historyIdxRef.current = -1;
    const userMsg: Message = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // Save user message to session
    sessionRef.current.appendMessage(userMsg);
    sessionRef.current.save();

    setPhase('followup-thinking');
    accumRef.current = '';
    setWordCount(0);
    setStreamingOutput('');

    try {
      const openRouter = new OpenRouterClient(input.apiKey);

      // Prepend system prompt if missing (e.g. older session loaded)
      let messagesToSend = [...newMessages];
      if (messagesToSend.length > 0 && messagesToSend[0].role !== 'system') {
        // Use the correct system prompt based on whether this is a chat or repo session
        const sysPrompt = input.repoUrl === 'chat'
          ? PromptBuilder.buildChatSystemPrompt(input.mode)
          : PromptBuilder.buildSystemPrompt();
        messagesToSend = [sysPrompt, ...messagesToSend];
      }

      const gen = openRouter.streamCompletion(input.model, messagesToSend, {
        maxTokens: 4096,
        temperature: 0.5,
      });

      // Start streaming — show live output immediately
      setPhase('followup-streaming');
      for await (const chunk of gen) {
        if (abortRef.current) break;
        if (chunk.done) break;
        accumRef.current += chunk.content;
        setStreamingOutput(accumRef.current);
        setWordCount(countWords(accumRef.current));
      }

      if (abortRef.current) return;

      const assistantMsg: Message = { role: 'assistant', content: accumRef.current };
      setMessages((prev) => [...prev, assistantMsg]);
      setPhase('done');

      // Save assistant message to session
      sessionRef.current.appendMessage(assistantMsg);
      sessionRef.current.save();
    } catch (err: unknown) {
      if (abortRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setPhase('error');
      onError(msg);
    }
  };

  // Build full conversation text from messages for rendered output in done state.
  // During streaming we show the live accumulator incrementally.
  const conversationText = (() => {
    if (messages.length === 0) return accumRef.current;
    const msgs = messages.filter((m) => m.role !== 'system');
    return msgs
      .map((m) => {
        const prefix = m.role === 'user' ? '**You:** ' : '';
        return `${prefix}${m.content}`;
      })
      .join('\n\n');
  })();
  const outputContent = (phase === 'streaming' || phase === 'followup-streaming')
    ? (streamingOutput || accumRef.current)
    : conversationText;

  // ── Repo identity strip ─────────────────────────────────────
  const repoLabel = repoMeta
    ? `${repoMeta.owner}/${repoMeta.repo}`
    : input.repoUrl === 'chat'
      ? 'General Chat'
      : input.repoUrl.replace('https://github.com/', '');

  return (
    <Box flexDirection="column" paddingLeft={2}>

      {/* ── Repo / context header ──────────────────────────────── */}
      <Box marginBottom={1} flexDirection="row" alignItems="center">
        <Text color="black" backgroundColor="cyan"> {repoLabel} </Text>
        {repoMeta?.language && (
          <>
            <Text color="cyan" dimColor>  ·  </Text>
            <Text color="white" dimColor>{repoMeta.language}</Text>
          </>
        )}
        {repoMeta?.stars !== undefined && (
          <>
            <Text color="cyan" dimColor>  ·  </Text>
            <Text color="yellow" dimColor>★ {repoMeta.stars.toLocaleString()}</Text>
          </>
        )}
        {input.mode !== 'standard' && (
          <>
            <Text color="cyan" dimColor>  ·  </Text>
            <Text color="black" backgroundColor="yellow">
              {' '}{input.mode === 'deep' ? '⬡ DEEP-DIVE' : '◈ ' + input.mode.toUpperCase()}{' '}
            </Text>
          </>
        )}
      </Box>

      {/* ── Query display ─────────────────────────────────────── */}
      {input.query && (
        <Box marginBottom={1}>
          <Text color="cyan" dimColor>› </Text>
          <Text color="white">{input.query}</Text>
        </Box>
      )}

      {/* ── Divider ───────────────────────────────────────────── */}
      <Text color="cyan" dimColor>{'╾' + '─'.repeat(60) + '╼'}</Text>

      {/* ── Progress spinner (initial fetch + analysis) ────────── */}
      {phase === 'running' && (
        <Box marginTop={1}>
          <Spinner label={progressMsg} color="cyan" step={stepBadge} />
        </Box>
      )}

      {/* ── Live streaming output (raw — avoids partial-markdown tearing) */}
      {(phase === 'streaming' || phase === 'followup-streaming') && (
        <Box flexDirection="column" marginTop={1}>
          {/* Word count strip */}
          <Box flexDirection="row" alignItems="center" marginBottom={0}>
            <Text color="black" backgroundColor="cyan"> GENERATING </Text>
            <Text color="cyan" dimColor>  {wordCount.toLocaleString()} words</Text>
          </Box>
          {outputContent && (
            <Box flexDirection="column">
              <Text color="white">{outputContent}</Text>
              <Text color="cyan">▋</Text>
            </Box>
          )}
        </Box>
      )}

      {/* ── Follow-up thinking spinner ────────────────────────── */}
      {phase === 'followup-thinking' && (
        <Box marginTop={1}>
          <Spinner label="Thinking…" color="green" />
        </Box>
      )}

      {/* ── Rendered markdown output (done state) ─────────────── */}
      {phase === 'done' && outputContent && (
        <OutputRenderer content={outputContent} />
      )}

      {/* ── Follow-up input panel ─────────────────────────────── */}
      {phase === 'done' && (
        <Box flexDirection="column" marginTop={1}>
          {input.autoCopy && messages.length <= 2 && (
            <Box marginBottom={1} flexDirection="row" alignItems="center">
              <Text color="black" backgroundColor="green"> ✓ COPIED </Text>
              <Text color="green" dimColor>  Output copied to clipboard</Text>
            </Box>
          )}
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="cyan"
            paddingX={1}
            marginTop={0}
          >
            <Box flexDirection="row" alignItems="center" marginBottom={0}>
              <Text color="black" backgroundColor="cyan"> FOLLOW-UP </Text>
              <Text color="cyan" dimColor>  Session #{sessionId}</Text>
            </Box>
            <Box flexDirection="row" alignItems="center">
              <Text color="cyan" bold>› </Text>
              <TextInput
                value={followUpInput}
                onChange={setFollowUpInput}
                onSubmit={handleFollowUpSubmit}
                placeholder="Ask a follow-up question…"
              />
            </Box>
            <Box height={1}>
              <Text color="white" dimColor> </Text>
            </Box>
          </Box>
          <Box marginTop={1} flexDirection="row" alignItems="center">
            <Text color="white" dimColor>  Press </Text>
            <Text color="black" backgroundColor="white"> Esc </Text>
            <Text color="white" dimColor> to save &amp; return to dashboard</Text>
          </Box>
        </Box>
      )}

      {/* ── Error state ───────────────────────────────────────── */}
      {phase === 'error' && (
        <Box
          marginTop={1}
          flexDirection="column"
          borderStyle="round"
          borderColor="red"
          paddingX={1}
        >
          <Box flexDirection="row" alignItems="center" marginBottom={0}>
            <Text color="black" backgroundColor="red"> ✗ ERROR </Text>
          </Box>
          <Text color="white" dimColor>{errorMsg}</Text>
          <Box marginTop={1} flexDirection="row" alignItems="center">
            <Text color="white" dimColor>  Press </Text>
            <Text color="black" backgroundColor="white"> Esc </Text>
            <Text color="white" dimColor> to return to dashboard</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
