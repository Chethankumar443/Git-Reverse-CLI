import { motion } from "framer-motion";
import { Terminal, Settings, Package, Search } from "lucide-react";

const sections = [
  {
    title: "Installation & Setup",
    icon: Package,
    content: (
      <div className="space-y-4">
        <p className="text-zinc-400">
          Git-Reverse is available via npm. Install it globally to make the
          command accessible from anywhere in your terminal.
        </p>
        <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 font-mono text-sm text-emerald-400">
          npm install -g git-reverse-cli
        </div>
        <p className="text-zinc-400">
          On first run, the CLI will ask for your preferred LLM provider API key
          (e.g., OpenRouter) and store it securely in a local configuration file.
        </p>
      </div>
    ),
  },
  {
    title: "Basic Usage",
    icon: Terminal,
    content: (
      <div className="space-y-4">
        <p className="text-zinc-400">
          Run the interactive dashboard by typing the following command in your terminal:
        </p>
        <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 font-mono text-sm text-emerald-400">
          git-reverse
        </div>
        <p className="text-zinc-400">
          From there, you can paste any public GitHub URL or absolute path to a
          local repository. The CLI will automatically clone or scan the repository,
          process the files according to your ignore rules, and generate a
          comprehensive contextual prompt.
        </p>
      </div>
    ),
  },
  {
    title: "Smart Ignore Rules",
    icon: Search,
    content: (
      <div className="space-y-4">
        <p className="text-zinc-400">
          By default, Git-Reverse applies aggressive ignore rules to keep the token
          count optimized. It will automatically filter out:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-zinc-400">
          <li><code>node_modules/</code>, <code>dist/</code>, <code>build/</code></li>
          <li>Binary files, images, PDFs, and minified bundles</li>
          <li>Configuration clutter (package-lock.json, yarn.lock)</li>
        </ul>
        <p className="text-zinc-400">
          You can override these locally by adding a <code>.gitreverseignore</code> file to your repository root.
        </p>
      </div>
    ),
  },
  {
    title: "Slash Commands",
    icon: Settings,
    content: (
      <div className="space-y-4">
        <p className="text-zinc-400">
          While inside the Git-Reverse prompt interface, you can type slash commands
          to instantly trigger advanced functionality:
        </p>
        <div className="rounded-lg bg-zinc-950 border border-zinc-800 divide-y divide-zinc-800">
          <div className="p-3 flex items-center justify-between">
            <code className="text-emerald-400 font-mono text-sm">/settings</code>
            <span className="text-xs text-zinc-500">Opens the config editor</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <code className="text-emerald-400 font-mono text-sm">/update</code>
            <span className="text-xs text-zinc-500">Updates CLI globally</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <code className="text-emerald-400 font-mono text-sm">/compact</code>
            <span className="text-xs text-zinc-500">Generates dense token output</span>
          </div>
        </div>
      </div>
    ),
  },
];

export const DocsPage = () => {
  return (
    <div className="min-h-screen pt-32 pb-24 px-4 md:px-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-transparent to-transparent -z-10" />

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span className="text-emerald-400 font-semibold tracking-wider uppercase text-sm mb-4 block">
            Documentation
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 tracking-tight mb-6">
            Git-Reverse CLI Reference
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
            Everything you need to know about installing, configuring, and leveraging
            the advanced features of Git-Reverse to supercharge your LLM workflows.
          </p>
        </motion.div>

        <div className="grid gap-12">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * idx }}
                className="relative"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-semibold text-zinc-100">
                    {section.title}
                  </h2>
                </div>
                <div className="pl-14">
                  {section.content}
                </div>
              </motion.section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
