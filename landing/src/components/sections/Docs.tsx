import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Terminal, FileCode2, Package, GitMerge } from "lucide-react";

const docsData = [
  {
    title: "Installation & Setup",
    icon: Package,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          Install the CLI globally using npm. Once installed, the <code className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-emerald-400 font-mono">git-reverse</code> command will be available across your system.
        </p>
        <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/60 flex items-center justify-between group">
          <code className="text-emerald-400 font-mono text-sm">npm install -g git-reverse-cli</code>
          <button
            onClick={() => navigator.clipboard.writeText('npm install -g git-reverse-cli')}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Copy to clipboard"
          >
            <ClipboardCopyIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    ),
  },
  {
    title: "Reverse Mode vs Explore Mode",
    icon: Terminal,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          Press <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-md text-zinc-200 text-xs font-sans">Tab</kbd> to toggle between modes directly in the CLI prompt:
        </p>
        <ul className="space-y-3 mt-2">
          <li className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
            <div>
              <strong className="text-zinc-200 font-medium text-sm">Reverse Mode:</strong>
              <p className="text-zinc-400 text-sm mt-0.5 leading-relaxed">
                Generates a highly-structured, token-optimized context dump of your codebase, perfect for pasting into Claude or ChatGPT to rebuild or add features.
              </p>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5" />
            <div>
              <strong className="text-zinc-200 font-medium text-sm">Explore Mode:</strong>
              <p className="text-zinc-400 text-sm mt-0.5 leading-relaxed">
                Generates educational, explorative context designed to help the LLM explain how the codebase works without outputting raw source files.
              </p>
            </div>
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Smart Ignore Engine",
    icon: FileCode2,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          By default, Git-Reverse automatically ignores common build artifacts and binary blobs to save your token window. This includes:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {["node_modules", ".git", "dist/", "build/", "*.png", "*.lock", "*.exe"].map((item) => (
            <div key={item} className="bg-zinc-900/50 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-zinc-400 text-center">
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Local Config Merging",
    icon: GitMerge,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          You can override global settings by placing a <code className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-emerald-400 font-mono">.gitreverse</code> file in the root of your project directory. 
        </p>
        <pre className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/60 overflow-x-auto">
          <code className="text-zinc-300 font-mono text-xs">
{`{
  "exclude": ["src/legacy", "**/*.test.ts"],
  "model": "claude-3.5-sonnet",
  "maxTokens": 100000
}`}
          </code>
        </pre>
      </div>
    ),
  },
];

function ClipboardCopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function AccordionItem({
  item,
  isOpen,
  onClick,
}: {
  item: typeof docsData[0];
  isOpen: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between py-5 px-2 text-left transition-colors hover:text-zinc-100 group"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-base font-medium text-zinc-100">
            {item.title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-zinc-500 group-hover:text-zinc-300"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 px-2 pl-[3.25rem]">
              {item.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const Docs = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="docs" className="relative w-full py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Documentation
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-100 leading-tight">
            Everything you need to know.
          </h2>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 backdrop-blur-md p-2 sm:p-6 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex flex-col">
            {docsData.map((item, idx) => (
              <AccordionItem
                key={item.title}
                item={item}
                isOpen={openIndex === idx}
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
