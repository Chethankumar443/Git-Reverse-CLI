import { Terminal } from "lucide-react";

const footerCols = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Commands", href: "#commands" },
      { label: "Walkthrough", href: "#onboarding" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { label: "Overview", href: "/docs" },
      { label: "Installation", href: "/docs#install" },
      { label: "Usage", href: "/docs#modes" },
    ],
  },
  {
    title: "Resources",
    links: [
      {
        label: "OpenRouter API",
        href: "https://openrouter.ai",
        external: true,
      },
      {
        label: "NPM Registry",
        href: "https://www.npmjs.com/package/git-reverse-cli",
        external: true,
      },
      {
        label: "GitHub",
        href: "https://github.com/Chethankumar443/Git-Reverse-CLI",
        external: true,
      },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950/60 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Terminal className="h-5 w-5 text-emerald-400" />
              <span className="text-base font-semibold tracking-tight text-zinc-100">
                Git-Reverse
              </span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-500 max-w-xs">
              An open-source developer tool to decode codebases and translate
              them into prompt-engineerable assets.
            </p>
          </div>

          {/* Link columns */}
          {footerCols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...("external" in link && link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/50 pt-8">
          <span className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Git-Reverse. Released under the
            MIT License.
          </span>
          <span className="text-xs text-zinc-700">v1.2.0</span>
        </div>
      </div>
    </footer>
  );
};
