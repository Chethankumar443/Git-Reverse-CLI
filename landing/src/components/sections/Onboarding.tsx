import { motion } from "framer-motion";

const steps = [
  {
    num: "01",
    title: "First-Time Setup",
    description:
      "Launch Git-Reverse globally. The TUI will ask for your name and your OpenRouter API key, providing a clickable link to fetch it.",
  },
  {
    num: "02",
    title: "Select Your Model",
    description:
      "Choose from a list of free, high-speed LLMs (or configure any paid model in settings). Settings are written locally to your UserConfig.",
  },
  {
    num: "03",
    title: "Analyze & Copy",
    description:
      "Paste any GitHub URL or local path. The CLI streams the markdown output live, highlighting syntax, and copies the prompt to your clipboard.",
  },
];

export const Onboarding = () => {
  return (
    <section id="onboarding" className="relative w-full py-24 md:py-32 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <motion.div
          className="mb-16 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Walkthrough
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-100 leading-tight">
            Reverse-engineer codebases in 3 steps.
          </h2>
          <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
            Onboarding takes less than a minute. Git-Reverse configures
            everything locally on first startup.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.12,
              }}
              className="group relative"
            >
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-8 transition-all duration-300 hover:border-emerald-500/30 hover:bg-zinc-900/60 h-full">
                <span className="mb-6 block font-mono text-5xl font-bold text-emerald-500/20 transition-colors group-hover:text-emerald-500/40">
                  {step.num}
                </span>
                <h3 className="mb-3 text-xl font-semibold text-zinc-100">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
