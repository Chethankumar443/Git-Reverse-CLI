import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
  outDir: 'dist',
  clean: true,
  minify: false,
  splitting: false,
  sourcemap: false,
  dts: false,
  external: [],
  noExternal: [],
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = 'react';
  },
});
