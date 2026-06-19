// ─────────────────────────────────────────────────────────────
//  git-reverse — Output Renderer
//  Rich markdown terminal rendering — custom block + inline parser
// ─────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { marked, Tokens } from 'marked';
import { BlinkingCursor } from './Animated.js';

interface OutputRendererProps {
  content: string;
  isStreaming?: boolean;
  wordCount?: number;
}

// ── Inline segment types ─────────────────────────────────────
interface Seg { text: string; bold?: boolean; code?: boolean; italic?: boolean }

function parseInline(raw: string): Seg[] {
  const segs: Seg[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) segs.push({ text: raw.slice(last, m.index) });
    if (m[1] !== undefined) segs.push({ text: m[1], bold: true });
    else if (m[2] !== undefined) segs.push({ text: m[2], code: true });
    else if (m[3] !== undefined) segs.push({ text: m[3], italic: true });
    last = m.index + m[0].length;
  }
  if (last < raw.length) segs.push({ text: raw.slice(last) });
  return segs.length > 0 ? segs : [{ text: raw }];
}

function InlineText({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.code ? (
          <Text key={i} color="green" bold>{s.text}</Text>
        ) : s.bold ? (
          <Text key={i} color="white" bold>{s.text}</Text>
        ) : s.italic ? (
          <Text key={i} color="yellow">{s.text}</Text>
        ) : (
          <Text key={i} color="white">{s.text}</Text>
        )
      )}
    </>
  );
}

// ── Block types ──────────────────────────────────────────────
type Block =
  | { type: 'heading'; depth: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; lang: string; text: string }
  | { type: 'list_item'; ordered: boolean; index: number; text: string }
  | { type: 'hr' }
  | { type: 'blockquote'; text: string }
  | { type: 'space' };

function parseToBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const tokens = marked.lexer(content);

  function walk(token: Tokens.Generic) {
    switch (token.type) {
      case 'heading':
        blocks.push({ type: 'heading', depth: (token as Tokens.Heading).depth, text: (token as Tokens.Heading).text });
        break;
      case 'paragraph':
        blocks.push({ type: 'paragraph', text: (token as Tokens.Paragraph).text });
        break;
      case 'code':
        blocks.push({ type: 'code', lang: (token as Tokens.Code).lang ?? '', text: (token as Tokens.Code).text });
        break;
      case 'list':
        (token as Tokens.List).items.forEach((item, idx) => {
          blocks.push({ type: 'list_item', ordered: (token as Tokens.List).ordered, index: idx + 1, text: item.text });
        });
        break;
      case 'blockquote':
        blocks.push({ type: 'blockquote', text: (token as Tokens.Blockquote).text });
        break;
      case 'hr':
        blocks.push({ type: 'hr' });
        break;
      case 'space':
        blocks.push({ type: 'space' });
        break;
    }
  }

  tokens.forEach(walk);
  return blocks;
}

function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const prefix = block.depth === 1 ? '▍' : block.depth === 2 ? '  ╸' : '    ·';
      const isBig = block.depth <= 2;
      return (
        <Box flexDirection="column" marginTop={isBig ? 1 : 0}>
          {block.depth === 1 && <Text color="cyan" dimColor>{'─'.repeat(60)}</Text>}
          <Text color="cyan" bold={isBig}>{prefix} {block.text}</Text>
          {block.depth === 1 && <Text color="cyan" dimColor>{'─'.repeat(60)}</Text>}
        </Box>
      );
    }
    case 'paragraph':
      return (
        <Box marginTop={0} flexWrap="wrap">
          <Text><InlineText segs={parseInline(block.text)} /></Text>
        </Box>
      );
    case 'code': {
      const lines = block.text.split('\n');
      const langLabel = block.lang ? ` ${block.lang.toUpperCase()} ` : ' CODE ';
      return (
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Box>
            <Text color="black" backgroundColor="cyan">{langLabel}</Text>
            <Text color="cyan" dimColor>{'─'.repeat(Math.max(0, 56 - langLabel.length))}</Text>
          </Box>
          {lines.map((line, i) => (
            <Box key={i}>
              <Text color="cyan" dimColor>{'│'}</Text>
              <Text color="green">{' '}{line}</Text>
            </Box>
          ))}
          <Text color="cyan" dimColor>{'└' + '─'.repeat(58)}</Text>
        </Box>
      );
    }
    case 'list_item': {
      const bullet = block.ordered ? `${block.index}.` : '•';
      return (
        <Box>
          <Text color="cyan">{`  ${bullet} `}</Text>
          <Text><InlineText segs={parseInline(block.text)} /></Text>
        </Box>
      );
    }
    case 'blockquote':
      return (
        <Box>
          <Text color="yellow">{'  ▎ '}</Text>
          <Text color="yellow" dimColor><InlineText segs={parseInline(block.text)} /></Text>
        </Box>
      );
    case 'hr':
      return <Box marginTop={1} marginBottom={1}><Text color="white" dimColor>{'─'.repeat(60)}</Text></Box>;
    default:
      return null;
  }
}

export function OutputRenderer({ content, isStreaming = false, wordCount }: OutputRendererProps) {
  const blocks = useMemo(() => {
    if (!content) return [];
    try { return parseToBlocks(content); }
    catch { return [{ type: 'paragraph' as const, text: content }]; }
  }, [content]);

  const wc = wordCount ?? content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {blocks.map((b, i) => <RenderBlock key={i} block={b} />)}
      {isStreaming && <BlinkingCursor color="cyan" />}
      {!isStreaming && content.length > 0 && (
        <Box marginTop={1} gap={2}>
          <Text color="white" dimColor>{'─'.repeat(44)}</Text>
          <Text color="cyan" dimColor>{wc.toLocaleString()} words</Text>
        </Box>
      )}
    </Box>
  );
}
