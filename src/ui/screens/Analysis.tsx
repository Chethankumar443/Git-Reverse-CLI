// ─────────────────────────────────────────────────────────────
//  git-reverse — Analysis Screen
//  Shows live streaming analysis output and supports continuous chat
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import clipboardy from 'clipboardy';
import { AnalysisService } from '../../core/AnalysisService.js';
import { OpenRouterClient } from '../../api/OpenRouterClient.js';
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
  const [progressMsg, setProgressMsg] = useState('Starting...');
  const [streamingOutput, setStreamingOutput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [repoMeta, setRepoMeta] = useState<RepoAnalysis['meta'] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionId, setSessionId] = useState('');
  const repoMetaRef = useRef<RepoAnalysis['meta'] | null>(null);
  const sessionRef = useRef(new SessionManager());
  const abortRef = useRef(false);

  useInput((_, key) => {
    if (key.escape && phase === 'done') {
      onBack();
    }
  });

  useEffect(() => {
    let accum = '';
    abortRef.current = false;

    // Check if we are resuming an existing session
    if (input.resumeSessionId) {
      const session = sessionRef.current.loadSession(input.resumeSessionId);
      if (session) {
        setSessionId(session.id);
        setRepoMeta(session.repoMeta ?? null);
        repoMetaRef.current = session.repoMeta ?? null;
        setMessages(session.messages);
        
        console.clear();
        for (const msg of session.messages) {
          if (msg.role === 'user') {
            if (msg.content.startsWith('# Repository:') || msg.content.includes('## Detected Tech Stack') || msg.content.includes('Key Files Content')) continue;
            console.log(`\n\x1b[36m\x1b[1mYou:\x1b[0m ${msg.content}\n`);
          } else if (msg.role === 'assistant') {
            console.log(`\x1b[32m\x1b[1mAgent:\x1b[0m\n${msg.content}\n`);
          }
        }
        
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
        let finalMessages: Message[] = [];
        const gen = service.analyze(input, (progress) => {
          if (abortRef.current) return;
          setProgressMsg(progress.message);
          if (progress.repoMeta) {
            setRepoMeta(progress.repoMeta);
            repoMetaRef.current = progress.repoMeta;
          }
          if (progress.phase === 'streaming') setPhase('streaming');
          if (progress.messages) {
            finalMessages = progress.messages;
          }
        });

        let hasStartedRaw = false;
        for await (const chunk of gen) {
          if (abortRef.current) break;
          if (chunk.done) break;
          accum += chunk.content;
          
          if (!hasStartedRaw) {
             hasStartedRaw = true;
             console.clear();
             console.log(`\x1b[32m\x1b[1mAgent:\x1b[0m\n`);
          }
          process.stdout.write(chunk.content);
        }
        if (hasStartedRaw) console.log('\n');

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

        sessionRef.current.setAnalysisOutput(accum);
        sessionRef.current.appendMessage({ role: 'assistant', content: accum });
        sessionRef.current.save();

        setSessionId(session.id);
        setMessages(sessionRef.current.getCurrent()?.messages ?? []);
        setStreamingOutput('');
        setPhase('done');

        if (input.autoCopy) {
          try {
            await clipboardy.write(accum);
          } catch (e) {
            // Ignore clipboard errors on headless CI
          }
        }

        onComplete(accum, session.id);
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
    const userMsg: Message = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // Save user message to session
    sessionRef.current.appendMessage(userMsg);
    sessionRef.current.save();

    setPhase('followup-thinking');
    setStreamingOutput('');

    try {
      const openRouter = new OpenRouterClient(input.apiKey);

      // Prepend system prompt if missing (e.g. older session loaded)
      let messagesToSend = [...newMessages];
      if (messagesToSend.length > 0 && messagesToSend[0].role !== 'system') {
        messagesToSend = [
          {
            role: 'system',
            content: 'You are git-reverse, an expert software architect and reverse-engineering analyst.',
          },
          ...messagesToSend,
        ];
      }

      const gen = openRouter.streamCompletion(input.model, messagesToSend, {
        maxTokens: 4096,
        temperature: 0.5,
      });

      let hasStartedRaw = false;
      for await (const chunk of gen) {
        if (abortRef.current) break;
        if (chunk.done) break;
        accum += chunk.content;
        
        if (!hasStartedRaw) {
           hasStartedRaw = true;
           console.log(`\n\x1b[36m\x1b[1mYou:\x1b[0m ${trimmed}\n`);
           console.log(`\x1b[32m\x1b[1mAgent:\x1b[0m\n`);
        }
        process.stdout.write(chunk.content);
      }
      if (hasStartedRaw) console.log('\n');

      if (abortRef.current) return;

      const assistantMsg: Message = { role: 'assistant', content: accum };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingOutput('');
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

  if (phase === 'streaming' || phase === 'followup-streaming') {
    return null;
  }

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {/* Repo header */}
      {repoMeta && (
        <Box marginBottom={1} flexDirection="row" gap={2}>
          <Text color="cyan">{repoMeta.owner}/{repoMeta.repo}</Text>
          <Text color="white" dimColor>·</Text>
          <Text color="white" dimColor>{repoMeta.language}</Text>
          <Text color="white" dimColor>·</Text>
          <Text color="white" dimColor>★ {repoMeta.stars.toLocaleString()}</Text>
        </Box>
      )}

      {/* Mode badge */}
      {input.mode !== 'standard' && (
        <Box marginBottom={1}>
          <Text color="yellow" dimColor>
            ◈ {input.mode === 'deep' ? 'deep-dive' : input.mode} mode
          </Text>
        </Box>
      )}

      {/* Query display */}
      {input.query && (
        <Box marginBottom={1}>
          <Text color="white" dimColor>Query: </Text>
          <Text color="white">{input.query}</Text>
        </Box>
      )}

      {/* Progress / spinner (initial analysis) */}
      {(phase === 'running' || phase === 'streaming') && (
        <Spinner label={progressMsg} color={phase === 'streaming' ? 'white' : 'cyan'} />
      )}

      {/* Chat history and streaming outputs are handled via raw process.stdout.write to prevent Ink tearing */}

      {/* Follow-up thinking spinner */}
      {phase === 'followup-thinking' && (
        <Spinner label="Thinking..." color="green" />
      )}

      {/* Done state with input for follow-up */}
      {phase === 'done' && (
        <Box flexDirection="column" marginTop={1}>
          {input.autoCopy && messages.length <= 2 && (
            <Box marginBottom={1}>
              <Text color="green">✓ The prompt has been copied to your clipboard!</Text>
            </Box>
          )}
          <Box flexDirection="row">
            <Text color="cyan" bold>› </Text>
            <TextInput
              value={followUpInput}
              onChange={setFollowUpInput}
              onSubmit={handleFollowUpSubmit}
              placeholder="Ask a follow-up question..."
            />
          </Box>
          <Box marginTop={1}>
            <Text color="white" dimColor>
              Press Esc to save and return to dashboard · Session #{sessionId}
            </Text>
          </Box>
        </Box>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="red">✗ Error</Text>
          <Box paddingLeft={2}>
            <Text color="white" dimColor>
              {errorMsg}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="white" dimColor>
              {'  '}Esc to return to dashboard
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
