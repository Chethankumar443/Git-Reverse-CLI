// ─────────────────────────────────────────────────────────────
//  git-reverse — Prompt Builder
//  Master Prompt Extraction Pipeline
//  Synthesizes repo skeleton → structured architectural blueprint
// ─────────────────────────────────────────────────────────────

import type { RepoAnalysis, Message, AnalysisMode } from '../types/index.js';
import { encode } from 'gpt-tokenizer';

// Content roles that are safe to read (architectural signals only — no raw source)
const CONTENT_ROLES_ALLOWED = new Set(['readme', 'package', 'config', 'schema']);

export class PromptBuilder {
  // ── Token Estimation ──────────────────────────────────────

  static estimateTokens(messages: Message[]): number {
    const text = messages.map((m) => m.content).join('\n');
    return encode(text).length;
  }

  // ── Master Prompt System Instruction ─────────────────────
  //  The "secret sauce" — strict hidden instruction that transforms
  //  the LLM from a chatbot into a pure architecture synthesizer.

  static buildSystemPrompt(): Message {
    return {
      role: 'system',
      content: `You are git-reverse, an expert Staff Engineer and architecture synthesizer.

You are given the SKELETON of a GitHub repository: the file tree, dependency manifests, README, and configuration files — but NOT the raw source code of implementation files.

## Your Singular Task
Reverse-engineer the project's INTENT and STRUCTURE into a single, dense, highly actionable **Master Prompt** — a blueprint that a developer could hand to an AI coding assistant (or follow themselves) to recreate this project from scratch.

## Absolute Rules
1. **DO NOT output raw source code** from the repository. Never reproduce file contents verbatim.
2. **DO NOT hallucinate features** not evidenced by the skeleton data.
3. **DO NOT use filler phrases**: no "leverages", "seamlessly", "robust", "cutting-edge", "state-of-the-art".
4. **DO prefix inferred information** with \`[Inferred]\` so the user knows what is confirmed vs. deduced.
5. **Output ONLY the Master Prompt** — no preamble, no "here is the analysis", no meta-commentary.
6. **Be developer-grade**: specific file names, package names, version constraints, CLI commands.

## Required Output Structure (always in this order)

### 1. Project Identity
One paragraph: what this project IS, what problem it solves, who the target user is. Ground every claim in the README or package description.

### 2. Tech Stack
Every confirmed dependency with its role. Format: \`package-name\` — why it's there and what it replaces.

### 3. Architecture
How the major components relate. Data flow from entry point to output. State management strategy. Side-effect boundaries.

### 4. Directory Structure (Annotated)
The file tree with one-line purpose annotations per directory/file. Do not list files not present in the skeleton.

### 5. Key Design Decisions
WHY these technology choices were made (infer from the combination of tools). What tradeoffs were accepted.

### 6. Build & Dev Process
Every script from the package manifest. Dev server, build, test, lint commands with flags.

### 7. Environment & Configuration
All config files found. Environment variables evident from \`.env.example\` or config files. External service dependencies.

### 8. Recreation Steps — Step-by-Step Implementation Guide
Numbered steps from \`git init\` (or project scaffold command) to a fully working state. Each step must be:
- Concrete (exact command or action)
- Ordered by dependency (cannot do step N before step N-1)
- Grouped by phase: Scaffold → Core → Features → Polish → Deploy
This section is MANDATORY. Never omit it.

### 9. Notable Patterns & Conventions
Coding patterns, naming conventions, architectural patterns (Factory, Repository, Observer, etc.) evident from the file structure and config.`,
    };
  }

  // ── Chat System Prompt (general questions, no repo) ───────

  static buildChatSystemPrompt(mode?: AnalysisMode): Message {
    let content = `You are git-reverse, an expert Staff Engineer and architecture synthesizer.
When the user asks to build, plan, or design a system/application, reverse-engineer the requirements and synthesize the intent and structure into a single, dense, highly detailed Master Prompt (acting as a blueprint for recreation).
Your response should follow this structured blueprint format:
1. Project Identity (spec)
2. Proposed Tech Stack
3. Architecture (data flow, state)
4. Designed Directory Structure (skeleton tree)
5. Key Design Decisions
6. Build & Dev Process (scripts/commands)
7. Environment & Configuration
8. Recreation Steps (step-by-step implementation guide)
9. Notable Patterns & Conventions

For general technical questions or conversation, you MUST structure your answer in a highly formal, professional, and organized format. Use Markdown headings, bullet points, and code blocks.
NEVER provide a casual, unstructured, or single-line response. Always break your answer down into logical sections. Avoid filler words. Always be direct, specific, and developer-grade.`;

    if (mode === 'deep') {
      content += `\n\n## Deep Dive Mode — Extended Sections Required
When synthesizing a system design, you MUST also include:
### 10. Design Pattern Catalogue
### 11. Learning Path
### 12. Pitfalls & Non-obvious Issues
### 13. Scaling Considerations
### 14. Time-to-Build Estimate`;
    } else if (mode === 'compact') {
      content += `\n\n## Compact Mode — Strict Constraints
Produce a CONDENSED Master Prompt. Hard limits:
- Total output: 600 words maximum
- Use bullet points throughout — no long paragraphs
- Skip unnecessary background explanations`;
    }

    return {
      role: 'system',
      content,
    };
  }

  // ── Standard Analysis Prompt ──────────────────────────────

  static buildAnalysisPrompt(analysis: RepoAnalysis, userQuery?: string): Message {
    const { meta, tree, keyFiles, stack, dependencies } = analysis;

    const treeStr = buildTreeString(tree, 4);
    const depsStr = formatDeps(dependencies);

    // Only include content for safe architectural-signal roles (no raw source)
    const safeFiles = keyFiles.filter((f) => CONTENT_ROLES_ALLOWED.has(f.role));
    const keyFilesStr = safeFiles
      .map((f) => `### ${f.path} [${f.role}]\n\`\`\`\n${f.content.slice(0, 4000)}\n\`\`\``)
      .join('\n\n');

    // List entrypoints by name only — confirm existence without dumping source
    const entryPoints = keyFiles.filter((f) => f.role === 'entrypoint').map((f) => f.path);

    const isLocal = meta.owner === 'local';
    const repoHeader = isLocal ? `Local Project: ${meta.repo}` : `${meta.owner}/${meta.repo}`;

    // Query pivot: when present, reframe the entire blueprint around the user's goal
    const querySection = userQuery?.trim()
      ? `\n\n## Synthesis Target (User Query)
The user wants: **"${userQuery.trim()}"**

After generating the standard 9-section Master Prompt, add a final section:

### 10. Query-Pivoted Blueprint
Directly address the user's query using evidence from the repository skeleton. If the query asks to convert, adapt, extend, or compare this project, describe exactly how the Master Prompt sections above would change to fulfil that goal. Be specific about what stays, what changes, and what new dependencies or patterns would be needed.`
      : '';

    return {
      role: 'user',
      content: `# Repository: ${repoHeader}

## Metadata
- Description: ${meta.description || 'No description provided'}
- Primary Language: ${meta.language}
${isLocal ? '' : `- Stars: ${meta.stars.toLocaleString()} | Forks: ${(meta.forks ?? 0).toLocaleString()}
- Topics: ${meta.topics.join(', ') || 'none'}
- Created: ${meta.createdAt?.split('T')[0]} | Last Updated: ${meta.updatedAt?.split('T')[0]}
- Repository Size: ${meta.size} KB`}
- Default Branch: ${meta.defaultBranch}

## Detected Tech Stack
${stack.map((t) => `- ${t}`).join('\n') || '- Unknown (no recognized patterns found)'}

## Entry Points (structure confirmed — no source content)
${entryPoints.length ? entryPoints.map((e) => `- \`${e}\``).join('\n') : '- Not detected'}

## Dependencies
${depsStr}

## Directory Structure (full skeleton)
\`\`\`
${treeStr}
\`\`\`

## Architectural Signal Files (manifests, configs, README only — no implementation source)
${keyFilesStr || '(no manifest or config files found)'}
${querySection}

---

Generate the complete Master Prompt now. Follow the 9-section structure exactly. Do not add preamble. Start directly with "### 1. Project Identity".`,
    };
  }

  // ── Deep Dive Prompt ──────────────────────────────────────

  static buildDeepDivePrompt(analysis: RepoAnalysis, userQuery?: string): Message {
    const base = PromptBuilder.buildAnalysisPrompt(analysis, userQuery);
    return {
      ...base,
      content:
        base.content +
        `\n\n## Deep Dive Mode — Extended Sections Required
In addition to the standard 9 sections, you MUST also include:

### 10. Design Pattern Catalogue
Every architectural and code design pattern evident from the skeleton (Factory, Singleton, Repository, Observer, Command, Adapter, etc.) — where it appears and why.

### 11. Learning Path
What prerequisite concepts must a developer understand before building this? Order from foundational to advanced.

### 12. Pitfalls & Non-obvious Issues
What will trip up developers trying to recreate this? Common mistakes given this tech stack. Non-obvious dependencies or ordering constraints.

### 13. Scaling Considerations
At what load/size does this architecture break? What would need to change to scale 10x or 100x?

### 14. Time-to-Build Estimate
Realistic hour estimates broken down by phase (Scaffold, Core Features, Polish, Testing, Deploy). Assume a senior developer working alone.`,
    };
  }

  // ── Compact Prompt ────────────────────────────────────────

  static buildCompactPrompt(analysis: RepoAnalysis, userQuery?: string): Message {
    const base = PromptBuilder.buildAnalysisPrompt(analysis, userQuery);
    return {
      ...base,
      content:
        base.content +
        `\n\n## Compact Mode — Strict Constraints
Produce a CONDENSED Master Prompt. Hard limits:
- Total output: 600 words maximum
- Use bullet points throughout — no long paragraphs
- Sections 1-6 combined into a single "Quick Spec" block
- Section 8 (Recreation Steps) must still be present but limited to 8 steps maximum
- Skip sections 7, 9 unless they contain critical non-obvious information
- If query present: answer it in 3 sentences max`,
    };
  }

  // ── Explore / Explain Prompt ──────────────────────────────

  static buildExplorePrompt(analysis: RepoAnalysis, userQuery?: string): Message {
    const base = PromptBuilder.buildAnalysisPrompt(analysis, userQuery);
    return {
      ...base,
      content:
        base.content +
        `\n\n## Explore Mode — Educational Framing
Instead of a "how to rebuild" blueprint, produce a "how it works" walkthrough:
- Write in second person ("When you run \`npm run dev\`, here is what happens...")
- Explain the data flow step by step, from user action to system response
- For each major directory, explain what type of code lives there and why
- Highlight the most interesting or non-obvious architectural choices
- If query present: answer it with depth — explain the WHY, not just the WHAT
- Assume the reader is a mid-level developer who wants to understand, not just copy`,
    };
  }

  // ── Summarize Session Prompt ──────────────────────────────

  static buildSummarizePrompt(messages: Message[]): Message {
    const sessionText = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n\n---\n\n');

    return {
      role: 'user',
      content: `Summarize this git-reverse session. Output a clean, scannable Markdown document with:
1. **Repository** — what was analyzed (name, stack, purpose)
2. **Master Prompt Summary** — 3-5 bullet points of key architectural findings
3. **User Queries** — each question the user asked and the key answer
4. **Action Items** — concrete next steps the user should take

Session transcript:
---
${sessionText}
---`,
    };
  }

  // ── Build Full Message Chain ──────────────────────────────

  static buildMessages(
    analysis: RepoAnalysis,
    mode: AnalysisMode,
    userQuery?: string,
  ): Message[] {
    const system = PromptBuilder.buildSystemPrompt();

    switch (mode) {
      case 'deep':
        return [system, PromptBuilder.buildDeepDivePrompt(analysis, userQuery)];
      case 'compact':
        return [system, PromptBuilder.buildCompactPrompt(analysis, userQuery)];
      case 'explore':
        return [system, PromptBuilder.buildExplorePrompt(analysis, userQuery)];
      default: // 'standard' | 'query'
        return [system, PromptBuilder.buildAnalysisPrompt(analysis, userQuery)];
    }
  }
}

// ── Tree String Builder ───────────────────────────────────────

function buildTreeString(
  files: RepoAnalysis['tree'],
  maxDepth: number,
): string {
  const lines: string[] = [];

  const sorted = [...files].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    return aDepth - bDepth || a.path.localeCompare(b.path);
  });

  const seen = new Set<string>();
  for (const f of sorted) {
    const depth = f.path.split('/').length - 1;
    if (depth > maxDepth) continue;
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    const indent = '  '.repeat(depth);
    const name = f.path.split('/').pop() ?? f.path;
    const suffix = f.type === 'dir' ? '/' : '';
    const size = f.size && f.type === 'file' && f.size > 0
      ? `  (${(f.size / 1024).toFixed(1)}KB)`
      : '';
    lines.push(`${indent}${name}${suffix}${size}`);
  }

  return lines.slice(0, 150).join('\n');
}

function formatDeps(deps: RepoAnalysis['dependencies']): string {
  const entries = Object.entries(deps);
  if (!entries.length) return '  No package manifest found';
  return entries.slice(0, 50).map(([name, version]) => `  ${name}: ${version}`).join('\n');
}
