// ─────────────────────────────────────────────────────────────
//  git-reverse — Path Utilities
//
//  Resolves the on-disk config location the same way `conf` does, so the path
//  we *show* to the user (via store.getStorePath()) and these constants agree:
//    • Linux/macOS: $XDG_CONFIG_HOME/git-reverse  (default ~/.config/git-reverse)
//    • Windows:     %APPDATA%\git-reverse
// ─────────────────────────────────────────────────────────────

import { homedir, platform, userInfo } from 'node:os';
import { join } from 'node:path';

const isWindows = platform() === 'win32';

function resolveConfigDir(): string {
  if (isWindows) {
    const appdata = process.env.APPDATA;
    if (appdata) return join(appdata, 'git-reverse');
    return join(homedir(), 'AppData', 'Roaming', 'git-reverse');
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, 'git-reverse');
  return join(homedir(), '.config', 'git-reverse');
}

export const HOME_DIR = homedir();
export const CONFIG_DIR = resolveConfigDir();

// Informational only — exposed for diagnostics / future use. Sessions are
// currently persisted inside the single `conf` JSON document, not here.
export const CURRENT_USER = userInfo().username;
