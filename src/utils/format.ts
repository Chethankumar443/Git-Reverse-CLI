// ─────────────────────────────────────────────────────────────
//  git-reverse — Format Utilities
// ─────────────────────────────────────────────────────────────

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function padEnd(str: string, len: number, char = ' '): string {
  return str.length >= len ? str : str + char.repeat(len - str.length);
}

export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function formatModelId(id: string): string {
  // "google/gemma-3-27b-it:free" → "gemma-3-27b"
  const parts = id.split('/');
  const name = parts[parts.length - 1] ?? id;
  return name.replace(/:free$/, '').replace(/-it$/, '');
}

export function formatModelProvider(id: string): string {
  return id.split('/')[0] ?? id;
}

export function wrapText(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length + word.length + 1 > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countLines(text: string): number {
  return text.split('\n').length;
}

// Simple markdown-to-terminal converter (no external deps)
export function renderMarkdownLine(line: string): string {
  return line
    .replace(/^### (.+)$/, '  $1')
    .replace(/^## (.+)$/, '$1')
    .replace(/^# (.+)$/, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^- /, '  · ')
    .replace(/^\d+\. /, (m) => `  ${m}`);
}
