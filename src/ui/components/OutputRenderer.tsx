// ─────────────────────────────────────────────────────────────
//  git-reverse — Output Renderer
//  Renders streamed LLM output with basic markdown formatting
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Box, Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { highlight } from 'cli-highlight';

marked.setOptions({
  // @ts-ignore - marked-terminal types are outdated for marked v15
  renderer: new TerminalRenderer() as any
});

interface OutputRendererProps {
  content: string;
  isStreaming?: boolean;
  wordCount?: number;
}

export function OutputRenderer({ content, isStreaming = false, wordCount }: OutputRendererProps) {
  // marked.parse returns HTML string by default, but with markedTerminal it returns ANSI
  const rendered = content ? (marked.parse(content) as string).trim() : '';

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {rendered.length > 0 && <Text>{rendered}</Text>}
      
      {isStreaming && (
        <Text color="cyan" dimColor>
          ▋
        </Text>
      )}
      {!isStreaming && content.length > 0 && (
        <Box marginTop={1}>
          <Text color="white" dimColor>
            {'─'.repeat(44)}{'  '}
          </Text>
          <Text color="white" dimColor>
            {wordCount ?? content.trim().split(/\s+/).filter(Boolean).length} words
          </Text>
        </Box>
      )}
    </Box>
  );
}
