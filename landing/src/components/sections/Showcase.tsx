import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Terminal, Code, Cpu } from "lucide-react";

const streamingText = `Analyzing src/core/SessionManager.ts...

Here is a brief overview of the SessionManager class:

- **State Management**: Uses an internal cache to persist prompt contexts.
- **Auto-Recovery**: Recovers unsaved sessions if the CLI crashes abruptly.
- **LLM Integration**: Prepares the context tree before handing it to the AI.

To fix the memory leak in the token counter, you can update the \`calculateTokens\` method:

\`\`\`typescript
public async calculateTokens(files: string[]): Promise<number> {
  const tokenizer = await import('gpt-tokenizer');
  let totalTokens = 0;
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    // Ensure we free up the array after counting
    const tokens = tokenizer.encode(content);
    totalTokens += tokens.length;
  }
  
  return totalTokens;
}
\`\`\`

Analysis complete. Total context tokens: **4,821**`;

const codeBlockRegex = /```typescript([\s\S]*?)```/g;
const boldRegex = /\*\*(.*?)\*\*/g;

// A naive but effective parser for the streaming text
const parseMarkdown = (text: string) => {
  // First extract code block
  const parts = text.split("```typescript");
  if (parts.length === 1) {
    // No code block yet
    return parseInline(text);
  }
  
  const beforeCode = parts[0];
  const afterCodeBlock = parts[1];
  
  const codeParts = afterCodeBlock.split("```");
  const isCodeComplete = codeParts.length > 1;
  const codeContent = codeParts[0];
  const afterCode = isCodeComplete ? codeParts[1] : "";

  return (
    <>
      {parseInline(beforeCode)}
      <div className="my-4 overflow-hidden rounded-lg border border-zinc-700/50 bg-[#0d1117] font-mono text-[13px] sm:text-sm">
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/50 px-4 py-2">
          <Code className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-zinc-400">SessionManager.ts</span>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="text-zinc-300">
            <code>{codeContent}</code>
          </pre>
        </div>
      </div>
      {isCodeComplete && parseInline(afterCode)}
    </>
  );
};

const parseInline = (text: string) => {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Process list items
    if (line.startsWith("- ")) {
      const rest = line.substring(2);
      return (
        <div key={i} className="flex gap-2 mb-1.5 ml-2 items-start">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <p className="text-sm text-zinc-300 leading-relaxed">
            {parseBold(rest)}
          </p>
        </div>
      );
    }
    
    // Normal paragraphs
    if (line.trim() === "") return <div key={i} className="h-3" />;
    
    return (
      <p key={i} className="mb-2 text-sm text-zinc-300 leading-relaxed">
        {parseBold(line)}
      </p>
    );
  });
};

const parseBold = (text: string) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {part}
        </strong>
      );
    }
    return part;
  });
};

export const Showcase = () => {
  const [displayedText, setDisplayedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!isStreaming) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex += 3; // Type 3 chars at a time for smooth streaming feel
      if (currentIndex >= streamingText.length) {
        currentIndex = streamingText.length;
        setIsStreaming(false);
        clearInterval(interval);
      }
      setDisplayedText(streamingText.substring(0, currentIndex));
    }, 15);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <section id="showcase" className="relative w-full py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <motion.div
          className="mb-16 max-w-2xl text-center mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Premium Aesthetic
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-100 leading-tight">
            No more text walls.
          </h2>
          <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
            Experience smooth streaming output with native markdown rendering directly in your terminal. Code blocks, bold text, and lists are formatted beautifully with zero screen tearing.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-zinc-800/80 bg-[#09090b]/80 shadow-2xl backdrop-blur-xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onViewportEnter={() => {
            // Start streaming when the terminal comes into view
            if (!displayedText) setIsStreaming(true);
          }}
        >
          {/* macOS Window Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <Terminal className="h-3.5 w-3.5" />
              <span>git-reverse — Explore Mode</span>
            </div>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>

          {/* Terminal Body */}
          <div className="p-6 md:p-8 min-h-[400px]">
            {/* User Input Mock */}
            <div className="mb-6 flex gap-3">
              <div className="flex h-6 items-center rounded bg-emerald-500/10 px-2 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                You
              </div>
              <p className="text-sm font-mono text-zinc-300 mt-0.5">
                Explain how the SessionManager class handles caching and token counting.
              </p>
            </div>

            {/* Agent Output Mock */}
            <div className="flex gap-3">
              <div className="flex shrink-0 h-6 items-center gap-1.5 rounded bg-sky-500/10 px-2 border border-sky-500/20 text-xs font-medium text-sky-400">
                <Cpu className="h-3 w-3" />
                Agent
              </div>
              <div className="w-full mt-0.5 min-h-[200px]">
                {parseMarkdown(displayedText)}
                
                {/* Blinking Cursor */}
                {isStreaming && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block h-4 w-2 bg-emerald-400 ml-1 translate-y-0.5"
                  />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
