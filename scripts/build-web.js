// scripts/build-web.js
//
// Historically this copied the marketing site (landing/*) into dist/ so Vercel
// could serve it from the bundled output. That had two problems:
//   1. Vercel now deploys directly from the repo's `landing/` folder, so the
//      copy was redundant.
//   2. Worse: `dist/` is what ships inside the published npm tarball, so every
//      `npm publish` was shipping ~88KB of landing HTML/CSS/JS to CLI users.
//
// This script is intentionally now a no-op kept only for build-script
// compatibility. The CLI bundle is produced solely by `tsup`.
console.log('build-web: landing assets are served from /landing (Vercel); nothing to copy into dist/');
