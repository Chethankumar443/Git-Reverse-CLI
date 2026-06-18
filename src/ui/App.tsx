// ─────────────────────────────────────────────────────────────
//  git-reverse — App Router
//  Central screen state machine
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Header } from './components/Header.js';
import { SetupUsername } from './screens/SetupUsername.js';
import { SetupApiKey } from './screens/SetupApiKey.js';
import { SetupModel } from './screens/SetupModel.js';
import { Dashboard } from './screens/Dashboard.js';
import { AnalysisScreen } from './screens/Analysis.js';
import { SettingsScreen } from './screens/Settings.js';
import { ResumeSession } from './screens/ResumeSession.js';
import { SessionBanner } from './components/SessionBanner.js';
import {
  getUser,
  getMergedUserConfig,
  getCachedModels,
  getNewModels,
  markModelsSeen,
  setCachedModels,
} from '../config/store.js';
import { OpenRouterClient } from '../api/OpenRouterClient.js';
import type {
  AppScreen,
  OpenRouterModel,
  AnalysisInput,
  AnalysisMode,
  Session,
} from '../types/index.js';
import { SessionManager } from '../core/SessionManager.js';

const VERSION = '1.0.0';

interface AppProps {
  resumeSessionId?: string;
  initialUrl?: string;
  initialModel?: string;
  autoCopy?: boolean;
  onUpdateTriggered?: () => void;
}

export function App({ resumeSessionId, initialUrl, initialModel, autoCopy, onUpdateTriggered }: AppProps) {
  const { exit } = useApp();

  // ── Load initial state ────────────────────────────────────
  const user = getMergedUserConfig();
  const cached = getCachedModels();

  const initialScreen: AppScreen = (() => {
    if (!user.setupComplete) return user.setupStep === 'username' ? 'setup-username' : 'setup-apikey';
    if (resumeSessionId) return 'resume-session';
    if (initialUrl) return 'analysis';
    return 'dashboard';
  })();

  const [screen, setScreen] = useState<AppScreen>(initialScreen);
  const [prevScreen, setPrevScreen] = useState<AppScreen>('dashboard');
  const [username, setUsername] = useState(user.name);
  const [activeModel, setActiveModel] = useState(user.selectedModel);
  const [freeModels, setFreeModels] = useState<OpenRouterModel[]>(cached.models);
  const [newModels, setNewModels] = useState<OpenRouterModel[]>([]);
  const [pendingAnalysis, setPendingAnalysis] = useState<AnalysisInput | null>(
    initialUrl && user.setupComplete
      ? {
          repoUrl: initialUrl,
          mode: 'standard',
          model: initialModel || user.selectedModel,
          apiKey: user.apiKey,
          autoCopy,
        }
      : null
  );
  const [exitSessionId, setExitSessionId] = useState<string | null>(null);
  const [exitRepoUrl, setExitRepoUrl] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState(resumeSessionId ?? '');

  // ── Background model refresh on launch ───────────────────
  useEffect(() => {
    if (!user.setupComplete || !user.apiKey) return;

    const refresh = async () => {
      try {
        const client = new OpenRouterClient(user.apiKey);
        if (!OpenRouterClient.isCacheStale(cached.fetchedAt)) return;

        const fresh = await client.fetchFreeModels();
        setCachedModels(fresh);
        setFreeModels(fresh);

        const unseen = getNewModels(fresh);
        if (unseen.length > 0) setNewModels(unseen);
      } catch {
        // Silent fail — user isn't blocked by model refresh failure
      }
    };

    refresh();
  }, []);

  // ── SIGINT / graceful exit ────────────────────────────────
  useEffect(() => {
    const sessionMgr = new SessionManager();
    sessionMgr.registerSigintHandler((savedId) => {
      const active = SessionManager.getActiveSession();
      if (active) {
        SessionManager.printExitBanner();
      } else {
        process.stdout.write('\n\n  Exiting git-reverse.\n\n');
      }
      process.exit(0);
    });
    return () => sessionMgr.removeSigintHandler();
  }, []);

  // ── Global keyboard: Esc to go back ──────────────────────
  useInput((_, key) => {
    if (key.escape) {
      if (screen === 'settings' || screen === 'resume-session') {
        navigateTo('dashboard');
      }
    }
  });

  const navigateTo = (next: AppScreen) => {
    console.clear();
    setPrevScreen(screen);
    setScreen(next);
  };

  // ── Screen handlers ───────────────────────────────────────

  const handleUsernameComplete = (name: string) => {
    setUsername(name);
    navigateTo('setup-apikey');
  };

  const handleApiKeyComplete = (models: OpenRouterModel[]) => {
    setFreeModels(models);
    navigateTo('setup-model');
  };

  const handleModelComplete = (model: OpenRouterModel) => {
    setActiveModel(model.id);
    navigateTo('dashboard');
  };

  const handleAnalyze = (repoUrl: string, query: string, mode: AnalysisMode) => {
    const currentUser = getMergedUserConfig();
    setPendingAnalysis({
      repoUrl,
      query,
      mode,
      model: currentUser.selectedModel,
      apiKey: currentUser.apiKey,
      githubToken: currentUser.githubToken,
    });
    navigateTo('analysis');
  };

  const handleCommand = (cmd: string) => {
    if (cmd === 'update') {
      if (onUpdateTriggered) onUpdateTriggered();
      exit();
      return;
    }
    if (cmd === 'settings') return navigateTo('settings');
    if (cmd === 'sessions') return navigateTo('resume-session');
    if (cmd === 'quit') { exit(); return; }
    if (cmd.startsWith('resume:')) {
      const id = cmd.slice(7);
      setResumeId(id);
      navigateTo('resume-session');
    }
  };

  const handleAnalysisComplete = (output: string, sessionId: string) => {
    setExitSessionId(sessionId);
    setExitRepoUrl(pendingAnalysis?.repoUrl ?? null);
    // Stay on analysis screen — user presses Esc to go back
  };

  const handleAnalysisBack = () => {
    setExitSessionId(null);
    navigateTo('dashboard');
  };

  const handleResumeSession = (session: Session) => {
    const currentUser = getMergedUserConfig();
    setPendingAnalysis({
      repoUrl: session.repoUrl,
      query: session.query,
      mode: session.mode,
      model: session.model,
      apiKey: currentUser.apiKey,
      githubToken: currentUser.githubToken,
      resumeSessionId: session.id,
    });
    navigateTo('analysis');
  };

  const handleModelChanged = (model: OpenRouterModel) => {
    setActiveModel(model.id);
    markModelsSeen(newModels.map((m) => m.id));
    setNewModels([]);
  };

  const handleUsernameChanged = (name: string) => {
    setUsername(name);
  };

  // ── Header visibility ─────────────────────────────────────
  const showHeader = screen !== 'analysis';

  return (
    <Box flexDirection="column">
      {showHeader && (
        <Header
          username={screen === 'dashboard' || screen === 'settings' ? username : undefined}
          model={activeModel || undefined}
          version={VERSION}
          newModelCount={newModels.length}
        />
      )}

      {screen === 'setup-username' && (
        <SetupUsername onComplete={handleUsernameComplete} />
      )}

      {screen === 'setup-apikey' && (
        <SetupApiKey onComplete={handleApiKeyComplete} />
      )}

      {screen === 'setup-model' && (
        <SetupModel models={freeModels} onComplete={handleModelComplete} />
      )}

      {screen === 'dashboard' && (
        <Dashboard
          username={username}
          model={activeModel}
          newModels={newModels}
          onAnalyze={handleAnalyze}
          onCommand={handleCommand}
        />
      )}

      {screen === 'analysis' && pendingAnalysis && (
        <AnalysisScreen
          input={pendingAnalysis}
          onComplete={handleAnalysisComplete}
          onBack={handleAnalysisBack}
          onError={() => {}}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          onBack={() => navigateTo('dashboard')}
          onModelChanged={handleModelChanged}
          onUsernameChanged={handleUsernameChanged}
        />
      )}

      {screen === 'resume-session' && (
        <ResumeSession
          initialId={resumeId}
          onResume={handleResumeSession}
          onBack={() => navigateTo('dashboard')}
        />
      )}
    </Box>
  );
}
