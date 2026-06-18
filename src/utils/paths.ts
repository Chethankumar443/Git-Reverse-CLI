// ─────────────────────────────────────────────────────────────
//  git-reverse — Path Utilities
// ─────────────────────────────────────────────────────────────

import { homedir } from 'os';
import { join } from 'path';

export const HOME_DIR = homedir();
export const CONFIG_DIR = join(HOME_DIR, '.config', 'git-reverse');
export const SESSIONS_DIR = join(CONFIG_DIR, 'sessions');
export const CACHE_DIR = join(CONFIG_DIR, 'cache');
