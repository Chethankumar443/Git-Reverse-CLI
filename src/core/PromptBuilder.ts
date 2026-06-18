// ─────────────────────────────────────────────────────────────
//  git-reverse — Prompt Builder
//  Constructs structured system + user prompts from repo analysis
// ─────────────────────────────────────────────────────────────

import type { RepoAnalysis, Message, AnalysisMode } from '../types/index.js';
import { encode } from 'gpt-tokenizer';

export class PromptBuilder {
  // ── Token Estimation ──────────────────────────────────────

  static estimateTokens(messages: Message[]): number {
    const text = messages.map((m) => m.content).join('\n');
    return encode(text).length;
  }
  // ── System Prompt ─────────────────────────────────────────

  static buildSystemPrompt(): Message {
    return {
      role: 'system',
      content: `You are git-reverse, an expert software architect and reverse-engineering analyst.

Your task is to analyze GitHub repository data and produce a comprehensive, accurate, structured recreation prompt that:
1. Explains exactly how the project was originally conceived and built
2. Documents the architecture, design decisions, and rationale
3. Provides enough detail that a developer could recreate it from scratch
4. Is honest about inferred vs. confirmed information

## Output Format Rules
- Use markdown with clear section headers
- Be specific: name actual files, packages, patterns
- Do NOT use filler phrases like "leverages", "seamlessly", "robust", "cutting-edge"
- Do NOT invent features not evidenced in the repository data
- Prefix any inferred information with [Inferred]
- Keep technical accuracy above completeness

## Sections to Include (always)
1. Project Overview (what it is, core purpose, target user)
2. Tech Stack (every confirmed dependency with purpose)
3. Architecture (how components relate, data flow)
4. Directory Structure (annotated)
5. Key Design Decisions (why these choices were made)
6. Build & Dev Process (scripts, tooling, CI)
7. Recreation Steps (numbered, from git init to working state)
8. Notable Patterns (code patterns, conventions used)

## Additional Sections (if query provided)
- Direct Answer to query, grounded in repo evidence`,
    };
  }

  // ── Standard Analysis Prompt ──────────────────────────────

  static buildAnalysisPrompt(analysis: RepoAnalysis, userQuery?: string): Message {
    const { meta, tree, keyFiles, stack, dependencies } = analysis;

    const treeStr = buildTreeString(tree, 3);
    const depsStr = formatDeps(dependencies);
    const keyFilesStr = keyFiles
      .map((f) => `### ${f.path} [${f.role}]\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\``)
      .join('\n\n');

    const entryPoints = keyFiles.filter((f) => f.role === 'entrypoint').map((f) => f.path);
    const configFiles = keyFiles.filter((f) => f.role === 'config').map((f) => f.path);

    const isLocal = meta.owner === 'local';
    const repoHeader = isLocal ? `Local Project: ${meta.repo}` : `${meta.owner}/${meta.repo}`;

    const querySection = userQuery?.trim()
      ? `\n\n## User Query\n${userQuery.trim()}\n\nAfter your full analysis, provide a direct, evidence-based answer to this query in a section titled "## Direct Answer".`
      : '';

    return {
      role: 'user',
      content: `# Repository: ${repoHeader}

## Metadata
- Description: ${meta.description || 'No description'}
- Primary Language: ${meta.language}
${isLocal ? '' : `- Stars: ${meta.stars.toLocaleString()} | Forks: ${(meta.forks ?? 0).toLocaleString()}
- Topics: ${meta.topics.join(', ') || 'none'}
- Created: ${meta.createdAt?.split('T')[0]} | Last Updated: ${meta.updatedAt?.split('T')[0]}
- Repo Size: ${meta.size} KB`}
- Default Branch: ${meta.defaultBranch}

## Detected Tech Stack
${stack.map((t) => `- ${t}`).join('\n') || '- Unknown'}

## Entry Points
${entryPoints.length ? entryPoints.map((e) => `- \`${e}\``).join('\n') : '- Not detected'}

## Config Files
${configFiles.length ? configFiles.map((c) => `- \`${c}\``).join('\n') : '- None found'}

## Dependencies
${depsStr}

## Directory Structure (filtered)
\`\`\`
${treeStr}
\`\`\`

## Key Files Content
${keyFilesStr}
${querySection}

---

Produce the full structured recreation prompt now. Be precise, developer-grade, and actionable.`,
    };
  }

  // ── Deep Dive Prompt ──────────────────────────────────────

  static buildDeepDivePrompt(analysis: RepoAnalysis, userQuery?: string): Message {
    const base = PromptBuilder.buildAnalysisPrompt(analysis, userQuery);
    return {
      ...base,
      content:
        base.content +
        `\n\n## Deep Dive Mode
You are in DEEP DIVE mode. In addition to the standard analysis:
- Explain every architectural decision in depth with rationale
- Document all design patterns identified (Factory, Observer, Repository, etc.)
- Provide a learning path: what concepts must be understood to build this
- Add a "Pitfalls & Non-obvious Issues" section
- Add a "Scaling Considerations" section
- Add estimated time to recreate broken down by phase
- Make this suitable as a comprehensive technical document, not just a reference`,
    };
  }

  // ── Compact / Summarize Prompt ────────────────────────────

  static buildSummarizePrompt(messages: Message[]): Message {
    const sessionText = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n\n---\n\n');

    return {
      role: 'user',
      content: `Summarize this git-reverse session concisely. Include:
1. Repository analyzed (owner/repo, stack, purpose)
2. Key findings from the analysis
3. Questions or queries the user had and how they were answered
4. Any next steps or action items mentioned

Session transcript:
---
${sessionText}
---
Produce a clean, scannable summary.`,
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
      case 'compact': {
        const base = PromptBuilder.buildAnalysisPrompt(analysis, userQuery);
        return [
          system,
          {
            ...base,
            content:
              base.content +
              `\n\n## Compact Mode\nYou are in COMPACT mode. Summarize this repository in the shortest, most concise way possible. Bullet points only. Skip lengthy architecture explanations and focus only on the absolute core structure, main tech stack, and primary purpose. If there is a query, answer it as briefly as possible.`
          }
        ];
      }
      case 'explore': {
        const base = PromptBuilder.buildAnalysisPrompt(analysis, userQuery);
        return [
          system,
          {
            ...base,
            content:
              base.content +
              `\n\n## Explore Mode\nYou are in EXPLORE mode. Focus on explaining how the repository works, explaining its design, file structures, and code flow. Explain it clearly like a senior developer tutoring a junior developer. If there is a query, answer it in detail and give educational code explanations.`
          }
        ];
      }
      default:
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
  const dirs = new Set<string>();

  // Collect all dirs
  for (const f of files) {
    const parts = f.path.split('/');
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }

  // Sort: dirs first, then files
  const sorted = [...files].sort((a, b) => {
    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
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
    lines.push(`${indent}${name}${suffix}`);
  }

  return lines.slice(0, 120).join('\n');
}

function formatDeps(deps: RepoAnalysis['dependencies']): string {
  const entries = Object.entries(deps);
  if (!entries.length) return '  No package manifest found';
  return entries.slice(0, 40).map(([name, version]) => `  ${name}: ${version}`).join('\n');
}
