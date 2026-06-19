import { motion } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Hero = () => {
  return (
    <section className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden text-zinc-50 font-sans selection:bg-emerald-500/30">
      


      <div className="container px-4 md:px-6 relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto gap-8 pt-24 pb-16">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full text-sm font-medium tracking-wide">
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
          The developer CLI that reverse-engineers codebases and generates highly-structured context for Claude and ChatGPT. Bypass boilerplate and optimize your token window.
        </motion.p>

        <motion.div 
          className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
          <Button size="lg" className="h-12 px-8 bg-zinc-100 text-zinc-950 hover:bg-zinc-300 rounded-full font-medium transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <Terminal className="mr-2 h-5 w-5" />
            Install CLI
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 border-zinc-800 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 rounded-full font-medium transition-colors">
            Read Docs
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>

      </div>
    </section>
  );
};
