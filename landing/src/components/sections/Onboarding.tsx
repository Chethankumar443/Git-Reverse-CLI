import { motion } from "framer-motion";
import { Play, Settings2, CopyCheck } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "First-Time Setup",
    description:
      "Launch Git-Reverse globally. The TUI will ask for your name and your OpenRouter API key, providing a clickable link to fetch it.",
    icon: Play,
  },
  {
    num: "02",
    title: "Select Your Model",
    description:
      "Choose from a list of free, high-speed LLMs (or configure any paid model in settings). Settings are written locally to your UserConfig.",
    icon: Settings2,
  },
  {
    num: "03",
    title: "Analyze & Copy",
    description:
      "Paste any GitHub URL or local path. The CLI streams the markdown output live, highlighting syntax, and copies the prompt to your clipboard.",
    icon: CopyCheck,
  },
];

export const Onboarding = () => {
  return (
    <section id="onboarding" className="relative w-full py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
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

        <div className="relative border-l border-zinc-800/60 ml-4 md:ml-6 pl-8 md:pl-12 space-y-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.1,
                }}
                className="relative group"
              >
                {/* Timeline Dot */}
                <div className="absolute -left-[41px] md:-left-[57px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 transition-colors duration-500 group-hover:bg-emerald-500 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 group-hover:bg-zinc-50 transition-colors" />
                </div>

                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 md:p-8 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/30 hover:bg-zinc-900/50">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-emerald-400 group-hover:scale-110 transition-transform duration-500">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-medium text-emerald-500/80">
                          {step.num}
                        </span>
                        <h3 className="text-xl font-semibold text-zinc-100">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-base leading-relaxed text-zinc-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
