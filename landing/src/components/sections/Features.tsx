import { motion } from "framer-motion";
import {
  ToggleLeft,
  Filter,
  Clipboard,
  Settings,
  Search,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: ToggleLeft,
    title: "Dual-Mode Toggling",
    description:
      "Press Tab instantly to switch between Reverse Mode (generate prompts to rebuild) and Explore Mode (educational codebase query).",
    accent: "emerald",
    span: "col-span-1",
  },
  {
    icon: Filter,
    title: "Smart Ignore Engine",
    description:
      "Automatically bypasses lockfiles, node_modules, build artifacts, images, and binary blobs to keep token windows optimized.",
    accent: "sky",
    span: "col-span-1",
  },
  {
    icon: Clipboard,
    title: "Auto-Clipboard Copy",
    description:
      "No more dragging your cursor across 1,000 lines of terminal output. Generates and silently copies the final prompt directly into your system clipboard.",
    accent: "amber",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: Settings,
    title: "Local Config Merging",
    description:
      "Define a local .gitreverse file inside any project directory to automatically merge specific token, model, or exclude list overrides on top of global settings.",
    accent: "rose",
    span: "col-span-1",
  },
  {
    icon: Search,
    title: "Fuzzy Context Search",
    description:
      "Type @ inside your CLI query prompt to open an interactive file tree. Fuzzy-search and attach only relevant files directly to the prompt context.",
    accent: "violet",
    span: "col-span-1",
  },
  {
    icon: Shield,
    title: "Token-Safety Warning",
    description:
      "Count tokens locally with gpt-tokenizer before calling OpenRouter. Warns you if the repo is too large to prevent raw, expensive 400 errors.",
    accent: "emerald",
    span: "col-span-1 md:col-span-2",
  },
];

const accentMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export const Features = () => {
  return (
    <section
      id="features"
      className="relative w-full py-24 md:py-32 bg-zinc-950"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <motion.div
          className="mb-16 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Features
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-100 leading-tight">
            Automate Codebase Context Generation.
          </h2>
          <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
            Generate high-fidelity AI prompts directly from your local files or
            GitHub URLs. Stop copy-pasting code and let the smart ignore engine
            handle the noise.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {features.map((feature) => {
            const colors = accentMap[feature.accent];
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className={`${feature.span} group relative rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 md:p-8 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/70`}
              >
                <div
                  className={`mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg} ${colors.border} border`}
                >
                  <Icon className={`h-5 w-5 ${colors.text}`} />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
