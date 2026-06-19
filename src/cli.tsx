// ─────────────────────────────────────────────────────────────
//  git-reverse — CLI Entry Point
//  Parses args, renders the Ink app
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { render } from 'ink';
import { App } from './ui/App.js';
import { SessionManager } from './core/SessionManager.js';
import updateNotifier from 'update-notifier';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import meow from 'meow';
import chalk from 'chalk';

// ── Intercept Global Commands ───────────────────────────────────

const args = process.argv.slice(2);
if (args[0] === 'update' || args[0] === 'upgrade') {
  console.clear();
  console.log(chalk.cyan('⠋ Upgrading git-reverse-cli to the latest version...'));
  
  try {
    execSync('npm install -g git-reverse-cli@latest', { 
      stdio: 'inherit'
    });
    console.log(chalk.green('\n✔ Successfully upgraded!'));
    process.exit(0);
  } catch (error) {
    console.log(chalk.red('\n✖ Upgrade failed.'));
    console.log('Please manually run: npm install -g git-reverse-cli@latest');
    process.exit(1);
  }
}

if (args[0] === 'uninstall') {
  console.clear();
  console.log(chalk.red('⠋ Uninstalling git-reverse-cli...'));
  
  try {
    execSync('npm uninstall -g git-reverse-cli', { 
      stdio: 'inherit'
    });
    console.log(chalk.green('\n✔ Successfully uninstalled.'));
    process.exit(0);
  } catch (error) {
    console.log(chalk.red('\n✖ Uninstall failed.'));
    console.log('Please manually run: npm uninstall -g git-reverse-cli');
    process.exit(1);
  }
}

// ── Check for updates ─────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 * 24 }).notify({ isGlobal: true });

// ── Parse CLI arguments ───────────────────────────────────────

const cli = meow(`
  git-reverse — Reverse-engineer any GitHub repository or local project

  Usage:
    git-reverse                    Launch interactive CLI
    git-reverse <url>              Directly analyze a GitHub repo
    git-reverse .                  Analyze the current local directory
    git-reverse <path>             Analyze any local directory
    
  Options:
    --resume <id>                  Resume a saved session
    --model <id>                   Specify the model to use
    --copy                         Copy output to clipboard when done
    --version                      Show version
    --help                         Show this help

  In the CLI:
    Paste a GitHub URL, local path (. or ./path), or question to analyze.

    Commands (type \\ to see palette):
    \\settings                      Modify username / API key / GitHub token / model
    \\update                        Update to the latest version
    \\deepdive                      Switch to deep-dive mode
    \\compact                       Summarize current session
    \\resume <id>                   Resume a past session
    \\sessions                      List all saved sessions
    \\quit                          Exit and save session

  Examples:
    git-reverse https://github.com/sindresorhus/ora
    git-reverse https://github.com/vitejs/vite --model openrouter/owl-alpha --copy
    git-reverse .                  (analyze your current project)
    git-reverse ./my-api           (analyze a local folder)

  Sessions are stored locally at:
    ~/.config/git-reverse/ (Linux/Mac)
    %APPDATA%\\git-reverse\\ (Windows)
`, {
  importMeta: import.meta,
  flags: {
    resume: { type: 'string' },
    model: { type: 'string' },
    copy: { type: 'boolean' }
  }
});

// ── Render ────────────────────────────────────────────────────

const resumeId = cli.flags.resume;
const url = cli.input[0];
const model = cli.flags.model;
const copy = cli.flags.copy ?? true;

let shouldUpdate = false;
const onUpdateTriggered = () => {
  shouldUpdate = true;
};

const { waitUntilExit } = render(
  <App
    resumeSessionId={resumeId}
    initialUrl={url}
    initialModel={model}
    autoCopy={copy}
    onUpdateTriggered={onUpdateTriggered}
  />,
  {
    exitOnCtrlC: false, // Handled manually by SessionManager for graceful save
    debug: false,
  },
);

waitUntilExit().then(() => {
  if (shouldUpdate) {
    console.clear();
    console.log('\n  ⠋ Checking the NPM registry for updates...');
    try {
      const latest = execSync('npm view git-reverse-cli version', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      
      if (latest === pkg.version) {
        console.log(`\n  ✔ You are already on the latest version (v${pkg.version})!\n`);
        SessionManager.printExitBanner();
        process.exit(0);
      }

      console.log(`\n  ⠋ Updating from v${pkg.version} to v${latest}...`);
      execSync('npm install -g git-reverse-cli@latest', { stdio: 'inherit' });
      console.log('\n  ✔ Successfully updated to the latest version!');
      console.log('  Please restart the CLI by typing `git-reverse` to use the new version.\n');
    } catch (err) {
      console.log('\n  ✖ Failed to update automatically.');
      console.log('  Please run this command manually: npm install -g git-reverse-cli@latest\n');
    }
  } else {
    SessionManager.printExitBanner();
  }
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
