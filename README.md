# git-reverse

Reverse-engineer any GitHub repository into a structured recreation prompt using LLMs.

Paste a GitHub URL. Get back a detailed prompt describing how the project was originally built — architecture, tech stack, dependencies, design decisions, and step-by-step recreation instructions.

---

## Install

```bash
npm install -g git-reverse
```

## Quick Start

```bash
git-reverse
```

On first launch you'll be asked for:
1. Your name (stored locally, used in greeting)
2. An OpenRouter API key ([get one free at openrouter.ai/keys](https://openrouter.ai/keys))
3. A model to use (list of free-tier models shown automatically)

---

## Usage

```
git-reverse                    Launch the CLI
git-reverse --resume <id>      Resume a saved session
git-reverse --version          Show version
git-reverse --help             Show help
```

### In the CLI

Paste a GitHub URL in the input:
```
https://github.com/sindresorhus/ora
```

With an optional query:
```
https://github.com/vitejs/vite   how does the plugin system work?
https://github.com/vercel/next.js   can I convert this to an Electron app?
```

---

## Commands

Press `\` to open the command palette, or type directly:

| Command | Alias | Description |
|---|---|---|
| `\settings` | — | Modify username, API key, or model |
| `\deepdive` | `\learn` | Deeply analyze with educational output |
| `\compact` | `\summarize` | Summarize the current session |
| `\resume <id>` | — | Resume a saved session by ID |
| `\sessions` | — | List all saved sessions |
| `\quit` | `\exit` | Save session and exit |

---

## Output Format

Every analysis produces a structured prompt containing:

- **Project Overview** — what it is, core purpose, target user
- **Tech Stack** — every confirmed dependency with purpose
- **Architecture** — component relationships, data flow
- **Directory Structure** — annotated file tree
- **Key Design Decisions** — why these choices were made
- **Build & Dev Process** — scripts, tooling, CI
- **Recreation Steps** — numbered, from git init to working state
- **Notable Patterns** — code patterns and conventions
- **Direct Answer** *(if query provided)* — addressed in context

---

## Sessions

Every analysis is saved as a session with a unique 8-character ID:

```
  Session saved
  ID: abc12345
  Resume: git-reverse --resume abc12345
```

Sessions are stored locally at:
- **Linux/Mac**: `~/.config/git-reverse/`
- **Windows**: `%APPDATA%\git-reverse\`

---

## Models

git-reverse uses [OpenRouter](https://openrouter.ai) to access LLMs. It automatically lists all **free-tier models** after you validate your key. When new free models appear on OpenRouter, git-reverse notifies you on the dashboard.

---

## Settings

Run `\settings` to:
- Change your username
- Update your OpenRouter API key
- Switch the active model
- Refresh the model list

---

## Privacy

Everything is stored locally. No telemetry, no analytics, no external storage. Your API key and sessions never leave your machine (except for the OpenRouter API calls you explicitly trigger).

---

## License

MIT
