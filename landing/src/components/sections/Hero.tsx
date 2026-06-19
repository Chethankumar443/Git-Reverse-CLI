import { motion } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const techStack = [
  "TypeScript",
  "React",
  "Next.js",
  "Python",
  "Rust",
  "Go",
  "Node.js",
  "Svelte",
  "Vue",
  "Ruby",
];

// Duplicate for seamless infinite scrolling
const marqueeItems = [...techStack, ...techStack, ...techStack];

export const Hero = () => {
  return (
    <section className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center overflow-hidden text-zinc-50 font-sans selection:bg-emerald-500/30">
      <div className="container px-4 md:px-6 relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto gap-8 pt-32 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full text-sm font-medium tracking-wide"
          >
            v1.2.0 Released — Reverse & Explore modes
          </Badge>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          Transform GitHub Repositories into LLM Context Prompts.
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          The developer CLI that reverse-engineers codebases and generates
          highly-structured context for Claude and ChatGPT. Bypass boilerplate
          and optimize your token window.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-6 mt-6 w-full sm:w-auto items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
          {/* Solid CTA Button */}
          <button className="flex h-12 items-center justify-center px-8 bg-zinc-100 text-zinc-950 rounded-full font-medium transition-all hover:bg-zinc-300">
            <Terminal className="mr-2 h-5 w-5" />
            Install CLI
          </button>

          <Link
            to="/docs"
            className="flex h-12 items-center justify-center px-8 text-zinc-400 hover:text-zinc-50 rounded-full font-medium transition-colors"
          >
            Read Docs
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </motion.div>
      </div>

      {/* Tech Stack Marquee */}
      <motion.div
        className="w-full overflow-hidden mt-auto pb-12 pt-16 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
      >
        {/* Fade masks for smooth edges */}
        <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#030712] to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#030712] to-transparent z-20 pointer-events-none" />

        <div className="flex w-fit">
          <motion.div
            className="flex gap-16 pr-16 items-center"
            animate={{ x: [0, -1035] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {marqueeItems.map((tech, i) => (
              <span
                key={`${tech}-${i}`}
                className="text-xl font-bold tracking-widest text-zinc-800 uppercase"
              >
                {tech}
              </span>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
