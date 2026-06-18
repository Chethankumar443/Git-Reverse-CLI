// scripts/postinstall.js
// Runs after `npm install -g git-reverse` to print a welcome message.

console.log(`
  ┌─────────────────────────────┐
  │  git-reverse  installed ✓   │
  └─────────────────────────────┘

  Run: git-reverse

  On first launch you'll set your name and OpenRouter API key.
  Get a free key at: https://openrouter.ai/keys

  Usage:
    git-reverse                    Start the CLI
    git-reverse --resume <id>      Resume a saved session
    git-reverse --help             Show all options
`);
