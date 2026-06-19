import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Commands", href: "#commands" },
    { label: "Walkthrough", href: "#onboarding" },
    { label: "Docs", href: "/docs" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <a href="/" className="flex items-center gap-2.5 group">
          <Terminal className="h-5 w-5 text-emerald-400 transition-transform group-hover:rotate-[-8deg]" />
          <span className="text-base font-semibold tracking-tight text-zinc-100">
            Git-Reverse
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="outline"
            className="h-9 rounded-full border-zinc-800 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 text-sm"
            onClick={() => window.open("https://github.com/Chethankumar443/Git-Reverse-CLI", "_blank")}
          >
            GitHub
          </Button>
          <Button
            className="h-9 rounded-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-sm font-medium"
            onClick={() => {
              navigator.clipboard.writeText("npm install -g git-reverse-cli --force");
            }}
          >
            Install CLI
          </Button>
        </div>

        <button
          className="md:hidden text-zinc-400 hover:text-zinc-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-zinc-800/50 md:hidden bg-zinc-950/95 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-4 py-3 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-100"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 border-t border-zinc-800/50 pt-3">
                <Button
                  className="w-full h-10 rounded-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-sm font-medium"
                  onClick={() => {
                    navigator.clipboard.writeText("npm install -g git-reverse-cli --force");
                    setMobileOpen(false);
                  }}
                >
                  Install CLI
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
