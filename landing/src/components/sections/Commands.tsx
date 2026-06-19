import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const terminalCommands = [
  {
    command: "git-reverse",
    description: "Launches the interactive CLI dashboard.",
  },
  {
    command: "npm update -g git-reverse-cli",
    description: "Updates the CLI globally to the latest version.",
  },
  {
    command: "npm install -g git-reverse-cli --force",
    description: "Installs the CLI globally on your system.",
  },
];

const slashCommands = [
  {
    command: "/settings",
    description:
      "Opens the persistent settings editor to modify API keys, username, or default models.",
    trigger: "Enter",
  },
  {
    command: "/update",
    description:
      "Checks npm registry, cleanly exits React/Ink, and updates globally via npm.",
    trigger: "Enter",
  },
  {
    command: "/compact",
    description:
      "Compresses the output into a highly dense bulleted architectural digest.",
    trigger: "Enter",
  },
  {
    command: "/deepdive",
    description:
      "Triggers detailed learning path and scaling pitfall analysis in the final output.",
    trigger: "Enter",
  },
  {
    command: "/sessions",
    description:
      "Lists all saved runs with their Nanoid references and timestamps.",
    trigger: "Enter",
  },
  {
    command: "/resume <id>",
    description:
      "Instantly resumes a past analysis session using its unique 8-character ID.",
    trigger: "Enter",
  },
  {
    command: "/quit",
    description: "Saves the current session history and closes the program.",
    trigger: "Enter",
  },
];

const tableRowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export const Commands = () => {
  const [activeTab, setActiveTab] = useState<"terminal" | "slash">("terminal");

  return (
    <section id="commands" className="relative w-full py-24 md:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-950/10 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl px-4 md:px-6">
        <motion.div
          className="mb-12 max-w-2xl text-center mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            CLI Commands
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-100 leading-tight">
            Control at your fingertips.
          </h2>
          <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
            Slash commands and shortcuts let you run updates, adjust settings,
            and manage sessions without leaving the interactive prompt.
          </p>
        </motion.div>

        {/* Tab Selection */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex space-x-1 rounded-full bg-zinc-900/60 p-1 border border-zinc-800/80 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("terminal")}
              className={`relative rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                activeTab === "terminal" ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              {activeTab === "terminal" && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 rounded-full bg-zinc-800"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Terminal Commands</span>
            </button>
            <button
              onClick={() => setActiveTab("slash")}
              className={`relative rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                activeTab === "slash" ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              {activeTab === "slash" && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 rounded-full bg-zinc-800"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Slash Commands</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-md min-h-[420px]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {activeTab === "terminal" ? (
              <motion.div
                key="terminal"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="divide-y divide-zinc-800/40"
              >
                {terminalCommands.map((cmd, i) => (
                  <motion.div
                    key={cmd.command}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 px-6 py-5 hover:bg-zinc-800/20 transition-colors"
                  >
                    <code className="shrink-0 text-sm font-mono text-emerald-400">
                      {cmd.command}
                    </code>
                    <span className="text-sm text-zinc-400">
                      {cmd.description}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="slash"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="divide-y divide-zinc-800/40"
              >
                {slashCommands.map((cmd, i) => (
                  <motion.div
                    key={cmd.command}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: i * 0.04 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 px-6 py-5 hover:bg-zinc-800/20 transition-colors"
                  >
                    <code className="shrink-0 min-w-[140px] text-sm font-mono text-emerald-400">
                      {cmd.command}
                    </code>
                    <span className="flex-1 text-sm text-zinc-400">
                      {cmd.description}
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                      <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">
                        {cmd.trigger}
                      </kbd>
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};
