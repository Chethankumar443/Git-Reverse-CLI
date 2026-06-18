// ─────────────────────────────────────────────────────────────
//  git-reverse — Session Manager
//  Handles: session save/load/resume, SIGINT capture
// ─────────────────────────────────────────────────────────────

import { nanoid } from 'nanoid';
import { saveSession, getSession, getAllSessions } from '../config/store.js';
import type { Session, Message, RepoAnalysis, AnalysisMode } from '../types/index.js';

export class SessionManager {
  private static activeInstance: SessionManager | null = null;
  private currentSession: Session | null = null;
  private sigintHandler: (() => void) | null = null;

  constructor() {
    SessionManager.activeInstance = this;
  }

  static getActiveSession(): Session | null {
    return SessionManager.activeInstance?.getCurrent() || null;
  }

  static printExitBanner(): void {
    const session = SessionManager.getActiveSession();
    if (session) {
      let desc = session.repoMeta?.description || '';
      if (!desc) {
        const owner = session.repoMeta?.owner || '';
        const repo = session.repoMeta?.repo || '';
        if (owner && repo) {
          desc = `Analysis of ${owner}/${repo}`;
          if (session.query) {
            desc = `${desc} - ${session.query}`;
          }
        } else {
          desc = `Analysis of ${session.repoUrl}`;
          if (session.query) {
            desc = `${desc} - ${session.query}`;
          }
        }
      }

      // Truncate description if too long
      if (desc.length > 60) {
        desc = desc.substring(0, 57) + '...';
      }

      process.stdout.write(`\n`);
      process.stdout.write(`  ___  _ _____     ____  ____ _  _ ____ ____ ____ ____\n`);
      process.stdout.write(`  | __ |   |  ___  |__/  |___ |  | |___ |__/ [__  |___\n`);
      process.stdout.write(`  [__] |   |       |  \\  |___  \\/  |___ |  \\ ___] |___\n`);
      process.stdout.write(`\n`);
      process.stdout.write(`  Session   ${desc}\n`);
      process.stdout.write(`  Continue  git-reverse --resume ${session.id}\n`);
      process.stdout.write(`\n`);
    }
  }

  // ── Create new session ────────────────────────────────────

  createSession(params: {
    repoUrl: string;
    query: string;
    model: string;
    mode: AnalysisMode;
    repoMeta?: RepoAnalysis['meta'];
  }): Session {
    const now = new Date().toISOString();
    const session: Session = {
      id: nanoid(8),
      createdAt: now,
      updatedAt: now,
      repoUrl: params.repoUrl,
      query: params.query,
      model: params.model,
      messages: [],
      analysisOutput: '',
      repoMeta: params.repoMeta,
      mode: params.mode,
    };
    this.currentSession = session;
    return session;
  }

  // ── Load existing session ─────────────────────────────────

  loadSession(id: string): Session | null {
    const session = getSession(id);
    if (session) {
      this.currentSession = session;
    }
    return session;
  }

  // ── Update session ────────────────────────────────────────

  appendMessage(message: Message): void {
    if (!this.currentSession) return;
    this.currentSession.messages.push(message);
    this.currentSession.updatedAt = new Date().toISOString();
  }

  appendOutput(chunk: string): void {
    if (!this.currentSession) return;
    this.currentSession.analysisOutput += chunk;
    this.currentSession.updatedAt = new Date().toISOString();
  }

  setAnalysisOutput(output: string): void {
    if (!this.currentSession) return;
    this.currentSession.analysisOutput = output;
    this.currentSession.updatedAt = new Date().toISOString();
  }

  updateRepoMeta(meta: RepoAnalysis['meta']): void {
    if (!this.currentSession) return;
    this.currentSession.repoMeta = meta;
  }

  // ── Persist session ───────────────────────────────────────

  save(): Session | null {
    if (!this.currentSession) return null;
    saveSession(this.currentSession);
    return this.currentSession;
  }

  getCurrent(): Session | null {
    return this.currentSession;
  }

  // ── Static helpers ────────────────────────────────────────

  static listSessions(): Session[] {
    return getAllSessions();
  }

  static getSession(id: string): Session | null {
    return getSession(id);
  }

  static formatSessionId(id: string): string {
    return `#${id}`;
  }

  // ── SIGINT handler ────────────────────────────────────────
  // Registers a handler that saves the session on Ctrl+C
  // and calls the provided onExit callback with the session ID

  registerSigintHandler(onExit: (sessionId: string | null) => void): void {
    this.sigintHandler = () => {
      const saved = this.save();
      onExit(saved?.id ?? null);
      process.exit(0);
    };
    process.on('SIGINT', this.sigintHandler);
  }

  removeSigintHandler(): void {
    if (this.sigintHandler) {
      process.removeListener('SIGINT', this.sigintHandler);
      this.sigintHandler = null;
    }
  }
}
