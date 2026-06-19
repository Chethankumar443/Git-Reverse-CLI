// ─────────────────────────────────────────────────────────────
//  git-reverse — App Router
//  Central screen state machine
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header } from './components/Header.js';
import { SetupUsername } from './screens/SetupUsername.js';
import { SetupApiKey } from './screens/SetupApiKey.js';
import { SetupModel } from './screens/SetupModel.js';
import { ChatScreen } from './screens/ChatScreen.js';
import { SettingsScreen } from './screens/Settings.js';
import { ResumeSession } from './screens/ResumeSession.js';
import { SplashScreen } from './screens/SplashScreen.js';
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
    if (resumeSessionId) return 'resume-session';
    if (initialUrl) return 'dashboard';
    return 'splash';
  })();

  const [screen, setScreen] = useState<AppScreen>(initialScreen);
  const [prevScreen, setPrevScreen] = useState<AppScreen>('dashboard');
  const [username, setUsername] = useState(user.name);
  const [activeModel, setActiveModel] = useState(user.selectedModel);
  const [freeModels, setFreeModels] = useState<OpenRouterModel[]>(cached.models);
  const [newModels, setNewModels] = useState<OpenRouterModel[]>([]);
  
  const [initialRunUrl, setInitialRunUrl] = useState<string | null>(initialUrl || null);
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
    // We register an empty SIGINT handler so that Node doesn't instantly exit.
    // This allows Ink's `useInput` to catch Ctrl+C manually in the screens.
    const handler = () => {};
    process.on('SIGINT', handler);
    return () => { process.removeListener('SIGINT', handler); };
  }, []);

  const navigateTo = (next: AppScreen) => {
    setPrevScreen(screen);
    setScreen(next);
  };

  // ── Screen handlers ───────────────────────────────────────

  const handleSplashComplete = () => {
    const currentUser = getMergedUserConfig();
    if (!currentUser.setupComplete || !currentUser.apiKey) {
      navigateTo(currentUser.name ? 'setup-apikey' : 'setup-username');
    } else {
      navigateTo('dashboard');
    }
  };

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

  const handleCommand = (cmd: string) => {
    if (cmd === 'update') {
      if (onUpdateTriggered) onUpdateTriggered();
      exit();
      return;
    }
    if (cmd === 'settings') return navigateTo('settings');
    if (cmd === 'sessions') return navigateTo('resume-session');
    if (cmd === 'clear') {
      process.stdout.write('\x1B[2J\x1B[0f');
      return;
    }
    if (cmd === 'quit') { exit(); return; }
    if (cmd.startsWith('resume:')) {
      const id = cmd.slice(7);
      setResumeId(id);
      navigateTo('dashboard');
    }
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
  const showHeader = screen !== 'dashboard' && screen !== 'splash';

  const terminalHeight = process.stdout.rows ? process.stdout.rows - 1 : 24;

  return (
    <Box flexDirection="column" minHeight={terminalHeight}>
      {showHeader && (
        <Header
          username={screen === 'settings' ? username : undefined}
          model={activeModel || undefined}
          version={VERSION}
          newModelCount={newModels.length}
        />
      )}

      {screen === 'splash' && (
        <SplashScreen onComplete={handleSplashComplete} />
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
        <ChatScreen
          initialResumeId={resumeId || undefined}
          initialUrl={initialRunUrl || undefined}
          newModels={newModels}
          onCommand={handleCommand}
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
          onResume={(session) => {
            setResumeId(session.id);
            navigateTo('dashboard');
          }}
          onBack={() => navigateTo('dashboard')}
        />
      )}
    </Box>
  );
}
