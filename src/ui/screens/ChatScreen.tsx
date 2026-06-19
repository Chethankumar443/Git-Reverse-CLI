// ─────────────────────────────────────────────────────────────
//  git-reverse — Unified Chat Screen
//  Combines Dashboard and Analysis into a continuous chat experience.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput, Static } from 'ink';
import TextInput from 'ink-text-input';
import clipboardy from 'clipboardy';
import { CommandPalette } from '../components/CommandPalette.js';
import { OutputRenderer } from '../components/OutputRenderer.js';
import { Spinner } from '../components/Spinner.js';
import { Header } from '../components/Header.js';
import { SessionBanner } from '../components/SessionBanner.js';
import { Notification } from '../components/Notification.js';
import { AnalysisService } from '../../core/AnalysisService.js';
import { OpenRouterClient } from '../../api/OpenRouterClient.js';
import { PromptBuilder } from '../../core/PromptBuilder.js';
import { SessionManager } from '../../core/SessionManager.js';
import { parseGitHubInput, isLocalPath } from '../../utils/github.js';
import { timeAgo } from '../../utils/format.js';
import { getMergedUserConfig } from '../../config/store.js';

import type { Message, AnalysisMode, OpenRouterModel, RepoAnalysis, Session } from '../../types/index.js';
import { execSync } from 'node:child_process';

interface ChatScreenProps {
  initialResumeId?: string;
  initialUrl?: string;
  newModels: OpenRouterModel[];
  onCommand: (command: string) => void;
}

type ChatPhase = 'idle' | 'running' | 'streaming' | 'error';

function parseLocalInput(input: string): { path: string; query: string } {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const first = parts[0] || '';
  if (isLocalPath(first)) {
    return { path: first, query: parts.slice(1).join(' ') };
  }
  return { path: trimmed, query: '' };
}

export function ChatScreen({ initialResumeId, initialUrl, newModels, onCommand }: ChatScreenProps) {
  const user = getMergedUserConfig();
  const [inputValue, setInputValue] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<ChatPhase>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [stepBadge, setStepBadge] = useState<string | undefined>(undefined);
  const [streamingOutput, setStreamingOutput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('standard');
  const [tuiMode, setTuiMode] = useState<'reverse' | 'explore'>('reverse');
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [repoMeta, setRepoMeta] = useState<RepoAnalysis['meta'] | null>(null);
  const repoMetaRef = useRef<RepoAnalysis['meta'] | null>(null);
  const sessionRef = useRef(new SessionManager());
  
  const abortRef = useRef(false);
  const accumRef = useRef('');

  // Refs for stable input handler
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const showPaletteRef = useRef(showPalette); showPaletteRef.current = showPalette;
  const inputValueRef = useRef(inputValue); inputValueRef.current = inputValue;

  useEffect(() => {
    if (initialResumeId) {
      const session = sessionRef.current.loadSession(initialResumeId);
      if (session) {
        setSessionId(session.id);
        setRepoMeta(session.repoMeta ?? null);
        repoMetaRef.current = session.repoMeta ?? null;
        setMessages(session.messages.filter(m => m.role !== 'system'));
        setPhase('idle');
      } else {
        setErrorMsg(`Session #${initialResumeId} not found.`);
        setPhase('error');
      }
    } else if (initialUrl) {
      handleAnalyze(initialUrl, '', mode);
    }
  }, []);

  const stableInputHandler = useCallback((input: string, key: any) => {
    // Ctrl+C interception
    if (input === '\u0003' || (key.ctrl && input === 'c')) {
      if (sessionId || phaseRef.current === 'streaming' || phaseRef.current === 'running') {
        // Stop current task and go back to dashboard
        abortRef.current = true;
        setSessionId(null);
        setMessages([]);
        setPhase('idle');
        setStreamingOutput('');
        setErrorMsg('');
      } else {
        // Clean exit
        SessionManager.printExitBanner();
        process.exit(0);
      }
      return;
    }

    if (key.escape && showPaletteRef.current) {
      setShowPalette(false);
      return;
    }
    if (key.escape && phaseRef.current === 'error') {
      setPhase('idle');
      setErrorMsg('');
      return;
    }
    // Command palette trigger
    if (inputValueRef.current === '' && (input === '\\' || input === '/') && !showPaletteRef.current && phaseRef.current === 'idle') {
      setShowPalette(true);
      setInputValue(input);
      return;
    }
    if (key.tab && inputValueRef.current === '' && phaseRef.current === 'idle') {
      setTuiMode(prev => prev === 'reverse' ? 'explore' : 'reverse');
      return;
    }
  }, [sessionId]);

  useInput(stableInputHandler);

  const handleCommand = (cmd: string) => {
    let normalized = cmd.trim();
    if (normalized.startsWith('/')) normalized = '\\' + normalized.slice(1);
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
    if (lower === '\\uninstall') {
      console.clear();
      console.log('\n  ⠋ Uninstalling git-reverse-cli...\n');
      try {
        execSync('npm uninstall -g git-reverse-cli', { stdio: 'inherit' });
        console.log('\n  ✔ Uninstalled git-reverse-cli.');
        process.exit(0);
      } catch (err) {
        console.log('\n  ✖ Failed to uninstall automatically.');
        process.exit(1);
      }
      return;
    }

    if (lower === '\\settings') return onCommand('settings');
    if (lower === '\\compact' || lower === '\\summarize') { setMode('compact'); return; }
    if (lower === '\\deepdive' || lower === '\\learn') { setMode('deep'); return; }
    if (lower === '\\sessions') return onCommand('sessions');
    if (lower === '\\clear') return onCommand('clear');
    if (lower.startsWith('\\resume ')) {
      const id = lower.slice(8).trim();
      return onCommand(`resume:${id}`);
    }
    if (lower === '\\quit' || lower === '\\exit') return onCommand('quit');
    
    setErrorMsg(`Unknown command: ${cmd}`);
    setPhase('error');
  };

  const handleSubmit = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('\\') || trimmed.startsWith('/')) {
      handleCommand(trimmed);
      return;
    }

    setInputValue('');
    
    // If we have an active session, it's a follow-up
    if (sessionId) {
      await runFollowUp(trimmed);
      return;
    }

    // Otherwise it's a new analysis
    let finalRepoUrl = trimmed;
    let finalQuery = '';
    const { parsed, query } = parseGitHubInput(trimmed);
    if (parsed) {
      finalRepoUrl = parsed.raw;
      finalQuery = query;
    } else {
      const firstWord = trimmed.split(/\s+/)[0] || '';
      if (isLocalPath(firstWord)) {
        const { path, query: localQuery } = parseLocalInput(trimmed);
        finalRepoUrl = path;
        finalQuery = localQuery;
      } else {
        finalRepoUrl = 'chat';
        finalQuery = trimmed;
      }
    }
    
    await handleAnalyze(finalRepoUrl, finalQuery, tuiMode === 'explore' ? 'explore' : mode);
  };

  const handleAnalyze = async (repoUrl: string, query: string, curMode: AnalysisMode) => {
    abortRef.current = false;
    accumRef.current = '';
    setPhase('running');
    setProgressMsg('Initializing analysis...');
    
    const userMsg: Message = { role: 'user', content: query || repoUrl };
    setMessages([userMsg]);

    const service = new AnalysisService(user.apiKey, user.githubToken);
    try {
      let finalMessages: Message[] = [];
      const gen = service.analyze({
        repoUrl, query, mode: curMode, model: user.selectedModel, apiKey: user.apiKey
      }, (progress) => {
        if (abortRef.current) return;
        setProgressMsg(progress.message);
        if (progress.step) setStepBadge(progress.step);
        if (progress.repoMeta) {
          setRepoMeta(progress.repoMeta);
          repoMetaRef.current = progress.repoMeta;
        }
        if (progress.phase === 'streaming') setPhase('streaming');
        if (progress.messages) finalMessages = progress.messages;
      });

      for await (const chunk of gen) {
        if (abortRef.current) break;
        if (chunk.done) break;
        accumRef.current += chunk.content;
        setStreamingOutput(accumRef.current);
      }
      
      if (abortRef.current) return;

      const session = sessionRef.current.createSession({
        repoUrl, query, model: user.selectedModel, mode: curMode, repoMeta: repoMetaRef.current ?? undefined
      });
      
      for (const m of finalMessages) sessionRef.current.appendMessage(m);
      sessionRef.current.setAnalysisOutput(accumRef.current);
      sessionRef.current.appendMessage({ role: 'assistant', content: accumRef.current });
      sessionRef.current.save();
      
      setSessionId(session.id);
      setMessages((sessionRef.current.getCurrent()?.messages || []).filter((m: Message) => m.role !== 'system'));
      setPhase('idle');
      setStreamingOutput('');
      
    } catch (err: any) {
      if (abortRef.current) return;
      setErrorMsg(err.message || String(err));
      setPhase('error');
    }
  };

  const runFollowUp = async (query: string) => {
    abortRef.current = false;
    accumRef.current = '';
    setPhase('running');
    setProgressMsg('Thinking...');
    
    const userMsg: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    sessionRef.current.appendMessage(userMsg);
    sessionRef.current.save();

    try {
      const openRouter = new OpenRouterClient(user.apiKey);
      const allMsgs = sessionRef.current.getCurrent()?.messages || [];
      const gen = openRouter.streamCompletion(user.selectedModel, allMsgs, { maxTokens: 4096, temperature: 0.5 });
      
      setPhase('streaming');
      for await (const chunk of gen) {
        if (abortRef.current) break;
        if (chunk.done) break;
        accumRef.current += chunk.content;
        setStreamingOutput(accumRef.current);
      }
      
      if (abortRef.current) return;
      
      const assistantMsg: Message = { role: 'assistant', content: accumRef.current };
      setMessages(prev => [...prev, assistantMsg]);
      sessionRef.current.appendMessage(assistantMsg);
      sessionRef.current.save();
      setPhase('idle');
      setStreamingOutput('');

    } catch (err: any) {
      if (abortRef.current) return;
      setErrorMsg(err.message || String(err));
      setPhase('error');
    }
  };

  const modeBg = tuiMode === 'reverse' ? 'cyan' : 'yellow';
  const modeLabel = tuiMode === 'reverse' ? 'REVERSE' : 'EXPLORE';
  const recentSessions = SessionManager.listSessions().slice(0, 3);

  return (
    <Box flexDirection="column" paddingX={2} flexGrow={1}>
      {newModels.length > 0 && <Notification newModels={newModels} />}
      
      {/* ── Chat History (Static for scrollback) ── */}
      <Static items={[{ type: 'header' } as any, ...messages]}>
        {(item, i) => {
          if (item.type === 'header') {
            return (
              <Header 
                key="header" 
                username={user.name} 
                model={user.selectedModel} 
                newModelCount={newModels.length} 
              />
            );
          }
          const msg = item as Message;
          return (
            <Box key={i} flexDirection="column" marginY={1}>
              <Text color={msg.role === 'user' ? 'green' : 'cyan'} bold>
                {msg.role === 'user' ? '› You' : '› git-reverse'}
              </Text>
              <Box paddingLeft={2} marginTop={1}>
                {msg.role === 'user' ? (
                  <Text>{msg.content}</Text>
                ) : (
                  <OutputRenderer content={msg.content} />
                )}
              </Box>
            </Box>
          );
        }}
      </Static>
      
      {/* ── Active Streaming Output ── */}
      {(phase === 'streaming' || phase === 'running') && (
        <Box flexDirection="column" marginY={1}>
          <Text color="cyan" bold>› git-reverse</Text>
          {phase === 'running' ? (
            <Box paddingLeft={2} marginTop={1}>
              <Spinner label={progressMsg} color="cyan" step={stepBadge} />
            </Box>
          ) : (
            <Box paddingLeft={2} marginTop={1}>
              <Text>{streamingOutput}</Text>
              <Text color="cyan">▋</Text>
            </Box>
          )}
        </Box>
      )}

      {/* ── Empty State / Dashboard ── */}
      {messages.length === 0 && phase === 'idle' && (
        <Box flexDirection="column" marginY={1}>
          <Box marginBottom={1} flexDirection="row" alignItems="center">
            <Text color="black" backgroundColor={modeBg}> {modeLabel} </Text>
            <Text color="white" dimColor>
              {'  '}{tuiMode === 'reverse' ? 'architecture synthesizer — outputs Master Prompt' : 'codebase walkthrough'}
            </Text>
          </Box>
          
          {recentSessions.length > 0 && (
            <Box flexDirection="column" marginTop={1} paddingLeft={1}>
              <Text color="white" bold>Recent Sessions</Text>
              {recentSessions.map((s, idx) => (
                <Box key={s.id} flexDirection="row" alignItems="center">
                  <Text color="black" backgroundColor="cyan"> {idx + 1} </Text>
                  <Text color="white" dimColor>  </Text>
                  <Text color="white">{s.repoUrl === 'chat' ? 'General Chat' : s.repoUrl.replace('https://github.com/', '')}</Text>
                  <Text color="cyan" dimColor>  ·  {timeAgo(s.updatedAt)}  #</Text>
                  <Text color="cyan" dimColor>{s.id}</Text>
                </Box>
              ))}
              <Box marginTop={1}>
                <Text color="white" dimColor>Type </Text>
                <Text color="cyan">\resume {'<id>'}</Text>
                <Text color="white" dimColor> to continue a session</Text>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* ── Floating Palette overlay ── */}
      {showPalette && (
        <Box flexDirection="column" marginBottom={1}>
          <CommandPalette visible={showPalette} />
        </Box>
      )}

      {/* ── Sticky Input Area ── */}
      {phase === 'idle' && (
        <Box flexDirection="column" marginTop={1}>
          {errorMsg && (
            <Box marginBottom={1}>
              <Text color="red">✗ {errorMsg}</Text>
            </Box>
          )}
          
          <Box flexDirection="row" alignItems="center">
            <Text color="cyan" bold>{'› '}</Text>
            <TextInput
              value={inputValue}
              onChange={(v) => { setInputValue(v); setErrorMsg(''); }}
              onSubmit={handleSubmit}
              placeholder={sessionId ? "Ask a follow-up..." : "Paste a repo URL or ask a question..."}
            />
          </Box>
          <Box marginTop={1} flexDirection="row" alignItems="center">
            <Text color="white" dimColor>  </Text>
            <Text color="black" backgroundColor="#29B8DB"> Enter </Text>
            <Text color="white" dimColor> submit  </Text>
            <Text color="black" backgroundColor="#29B8DB"> \ </Text>
            <Text color="white" dimColor> commands  </Text>
            <Text color="black" backgroundColor="#29B8DB"> Tab </Text>
            <Text color="white" dimColor> mode</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
