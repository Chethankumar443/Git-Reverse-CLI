import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuroraBackground } from './AuroraBackground.js';

const rootElement = document.getElementById('aurora-bg-root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<AuroraBackground />);
}
