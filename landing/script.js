/* ─────────────────────────────────────────────────────────────
   git-reverse — Interactive Landing Page Script & 3D Canvas
   ───────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Copy-to-Clipboard Action ────────────────────────────
  const copyBtn = document.getElementById('copy-install-btn');
  const copyToast = document.getElementById('copy-toast');
  const installPill = document.getElementById('install-pill');

  const handleCopy = async (textToCopy) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      
      if (copyToast) {
        copyToast.classList.add('show');
        setTimeout(() => {
          copyToast.classList.remove('show');
        }, 2500);
      }

      if (installPill) {
        installPill.style.borderColor = 'var(--color-accent-green)';
        setTimeout(() => {
          installPill.style.borderColor = 'var(--color-hairline)';
        }, 500);
      }

    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      if (copyToast) {
        copyToast.classList.add('show');
        setTimeout(() => {
          copyToast.classList.remove('show');
        }, 2500);
      }
    }
  };

  if (copyBtn) copyBtn.addEventListener('click', () => handleCopy('npm install -g git-reverse-cli --force'));
  if (installPill) {
    installPill.style.cursor = 'pointer';
    installPill.addEventListener('click', () => handleCopy('npm install -g git-reverse-cli --force'));
  }

  const navInstall = document.getElementById('btn-nav-install');
  const drawerInstall = document.getElementById('btn-drawer-install');
  if (navInstall) navInstall.addEventListener('click', () => handleCopy('npm install -g git-reverse-cli --force'));
  if (drawerInstall) drawerInstall.addEventListener('click', () => handleCopy('npm install -g git-reverse-cli --force'));

  // ── 2. Mobile Nav Drawer Toggle ───────────────────────────
  const navToggle = document.getElementById('nav-toggle');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');

  if (navToggle && mobileDrawer) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      mobileDrawer.classList.toggle('active');
    });

    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        mobileDrawer.classList.remove('active');
      });
    });
  }

  // ── 3. 3D Perspective Network Background ──────────────────
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particleCount = 120;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = Math.random() * 260 + 40;
      
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        phase: Math.random() * Math.PI
      });
    }

    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let rotX = 0;
    let rotY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / width) - 0.5;
      mouseY = (e.clientY / height) - 0.5;
      targetRotY = mouseX * 0.6;
      targetRotX = mouseY * 0.6;
    });

    const fov = 350;
    const cameraZ = 450;

    function animate() {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      ctx.clearRect(0, 0, width, height);

      rotX += (targetRotX - rotX) * 0.05;
      rotY += (targetRotY - rotY) * 0.05;

      const autoRotY = Date.now() * 0.0001;
      const totalRotY = rotY + autoRotY;
      const totalRotX = rotX + Math.sin(Date.now() * 0.00008) * 0.15;

      const projected = [];
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        
        const drift = Math.sin(autoRotY * 2 + p.phase) * 4;
        const px = p.x;
        const py = p.y + drift;
        const pz = p.z;

        let x1 = px * Math.cos(totalRotY) - pz * Math.sin(totalRotY);
        let z1 = px * Math.sin(totalRotY) + pz * Math.cos(totalRotY);

        let y2 = py * Math.cos(totalRotX) - z1 * Math.sin(totalRotX);
        let z2 = py * Math.sin(totalRotX) + z1 * Math.cos(totalRotX);

        const scale = fov / (fov + z2 + cameraZ);
        if (scale < 0) continue;

        projected.push({
          x: x1 * scale + width / 2,
          y: y2 * scale + height / 2,
          z2: z2,
          scale: scale,
          orig: p
        });
      }

      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];

          const dx = p1.orig.x - p2.orig.x;
          const dy = p1.orig.y - p2.orig.y;
          const dz = p1.orig.z - p2.orig.z;
          const dist3d = Math.sqrt(dx*dx + dy*dy + dz*dz);

          if (dist3d < 110) {
            const alpha = (1 - dist3d / 110) * 0.15 * Math.min(p1.scale, p2.scale);
            ctx.strokeStyle = isLight ? `rgba(9, 105, 218, ${alpha})` : `rgba(87, 193, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const radius = Math.max(1, p.scale * 2.2);
        const alpha = Math.min(1, p.scale * 0.4);
        
        ctx.fillStyle = isLight ? `rgba(15, 23, 42, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(animate);
    }

    animate();
  }

  // ── 4. Interactive TUI Mockup Simulation ─────────────────
  const mockInput = document.getElementById('mock-input-text');
  const mockStatusMode = document.getElementById('mock-status-mode');
  const suggestionsList = document.getElementById('suggestions-list');
  const mockTerminalView = document.getElementById('mock-terminal-view');
  const inputRow = document.querySelector('.mock-tui-input-row');
  
  const mockUserMsg1 = document.getElementById('mock-user-msg-1');
  const mockAgentMsg1 = document.getElementById('mock-agent-msg-1');
  const mockOutput1 = document.getElementById('mock-output-1');
  const mockClipboardSuccess = document.getElementById('mock-clipboard-success');
  const mockFollowupRow = document.getElementById('mock-followup-row');
  const mockFollowupInput = document.getElementById('mock-followup-input');
  const mockAgentMsg2 = document.getElementById('mock-agent-msg-2');
  const mockOutput2 = document.getElementById('mock-output-2');
  const mockSessionFootnote = document.getElementById('mock-session-footnote');

  const suggestions = document.querySelectorAll('#suggestions-list .suggestion-row');

  const initialUrl = 'https://github.com/vitejs/vite';
  const followUpText = 'explain dev server startup';

  const response1Items = [
    { tag: 'h1', text: 'Vite Repository Architecture' },
    { tag: 'h2', text: 'Core Tech Stack' },
    { tag: 'li', text: 'TypeScript, Rollup, Esbuild' },
    { tag: 'h2', text: 'Key Modules' },
    { tag: 'li', text: 'src/node/server: Dev server core' },
    { tag: 'li', text: 'src/node/plugin: Rollup plugin system' }
  ];

  const response2Items = [
    { tag: 'h2', text: 'Dev Server Startup Flow' },
    { tag: 'li', text: 'Resolves vite.config.ts config file' },
    { tag: 'li', text: 'Initializes Rollup plugin container' },
    { tag: 'li', text: 'Starts Connect HTTP server & HMR WS' }
  ];

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  async function typeText(element, text, speed = 40) {
    element.textContent = '';
    const terminalView = document.getElementById('mock-terminal-view');
    for (let i = 0; i < text.length; i++) {
      element.textContent += text[i];
      if (terminalView) terminalView.scrollTop = terminalView.scrollHeight;
      await delay(speed);
    }
  }

  async function streamMarkdownLines(element, items) {
    element.innerHTML = '';
    const terminalView = document.getElementById('mock-terminal-view');
    for (let item of items) {
      const el = document.createElement(item.tag);
      element.appendChild(el);
      if (terminalView) terminalView.scrollTop = terminalView.scrollHeight;
      await typeText(el, item.text, 20);
      await delay(80);
    }
  }

  function setActiveSuggestion(index) {
    suggestions.forEach((row, i) => {
      if (i === index) {
        row.classList.add('active');
      } else {
        row.classList.remove('active');
      }
    });
  }

  async function runSimulation() {
    if (mockTerminalView) mockTerminalView.style.display = 'none';
    if (mockUserMsg1) mockUserMsg1.style.display = 'none';
    if (mockAgentMsg1) mockAgentMsg1.style.display = 'none';
    if (mockOutput1) mockOutput1.innerHTML = '';
    if (mockClipboardSuccess) mockClipboardSuccess.style.display = 'none';
    if (mockFollowupRow) mockFollowupRow.style.display = 'none';
    if (mockFollowupInput) mockFollowupInput.textContent = '';
    if (mockAgentMsg2) mockAgentMsg2.style.display = 'none';
    if (mockOutput2) mockOutput2.innerHTML = '';
    if (mockSessionFootnote) mockSessionFootnote.style.display = 'none';

    if (inputRow) inputRow.style.display = 'flex';
    if (suggestionsList) suggestionsList.style.display = 'flex';
    if (mockInput) mockInput.textContent = '';
    
    if (mockStatusMode) {
      mockStatusMode.textContent = 'Reverse Mode';
      mockStatusMode.className = 'cyan-text bold';
    }
    setActiveSuggestion(0);

    await delay(1500);

    if (mockInput) {
      await typeText(mockInput, initialUrl, 60);
    }
    await delay(1200);

    setActiveSuggestion(1);
    if (mockStatusMode) {
      mockStatusMode.textContent = 'Explore Mode';
      mockStatusMode.className = 'yellow-text bold';
    }
    await delay(1500);

    setActiveSuggestion(0);
    if (mockStatusMode) {
      mockStatusMode.textContent = 'Reverse Mode';
      mockStatusMode.className = 'cyan-text bold';
    }
    await delay(1000);

    if (mockStatusMode) {
      mockStatusMode.textContent = '⠋ Analyzing repository tree...';
      mockStatusMode.className = 'dim-text';
    }
    await delay(1500);

    if (mockStatusMode) {
      mockStatusMode.textContent = '⠋ Generating recreation prompt...';
    }
    await delay(1200);

    if (inputRow) inputRow.style.display = 'none';
    if (suggestionsList) suggestionsList.style.display = 'none';
    if (mockTerminalView) {
      mockTerminalView.style.display = 'flex';
      mockTerminalView.style.flexDirection = 'column';
    }

    if (mockUserMsg1) mockUserMsg1.style.display = 'flex';
    await delay(400);

    if (mockAgentMsg1) mockAgentMsg1.style.display = 'flex';
    if (mockOutput1) {
      await streamMarkdownLines(mockOutput1, response1Items);
    }
    await delay(600);

    if (mockClipboardSuccess) mockClipboardSuccess.style.display = 'block';
    await delay(1500);

    if (mockFollowupRow) mockFollowupRow.style.display = 'flex';
    if (mockFollowupInput) {
      await typeText(mockFollowupInput, followUpText, 50);
    }
    await delay(1000);

    if (mockClipboardSuccess) mockClipboardSuccess.style.display = 'none';

    if (mockAgentMsg2) mockAgentMsg2.style.display = 'flex';
    if (mockOutput2) {
      await streamMarkdownLines(mockOutput2, response2Items);
    }
    await delay(600);

    if (mockSessionFootnote) mockSessionFootnote.style.display = 'block';
  }

  // ── 6. Scroll Reveal Observer ─────────────────────────────
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Also observe doc cards
  const docObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        docObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -20px 0px'
  });

  document.querySelectorAll('.doc-card').forEach(el => docObserver.observe(el));

  // ── 7. Spotlight Mouse Tracking on Feature Cards ──────────
  document.querySelectorAll('.feature-card-dark').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  });

  // ── 7b. 3D Card Tilt (feature cards + mockup) ─────────────
  const tiltTargets = document.querySelectorAll('.feature-card-dark, .command-palette-card');
  tiltTargets.forEach(el => {
    let rafId = null;
    let currentX = 0, currentY = 0;
    let targetX = 0, targetY = 0;
    const MAX_TILT = 6;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      targetX = ((y - centerY) / centerY) * -MAX_TILT;
      targetY = ((x - centerX) / centerX) * MAX_TILT;
      if (!rafId) rafId = requestAnimationFrame(updateTilt);
    });

    el.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
      if (!rafId) rafId = requestAnimationFrame(updateTilt);
    });

    function updateTilt() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      el.style.transform = `perspective(800px) rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
      if (Math.abs(targetX - currentX) < 0.01 && Math.abs(targetY - currentY) < 0.01) {
        currentX = targetX;
        currentY = targetY;
        el.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(updateTilt);
    }
  });

  // ── 8. Docs Section Interactivity ─────────────────────────
  const docLinks = document.querySelectorAll('.docs-article h3.doc-title');
  docLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.id;
      if (targetId) {
        window.location.hash = targetId;
      }
    });
  });

  // ── 6. Smooth Scrolling for Anchor Links ─────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Start the simulation loop
  if (mockInput && mockStatusMode && suggestions.length >= 2) {
    runSimulation();
  }

  // ── 9. Light/Dark Theme Toggle ─────────────────────────────
  const themeToggles = document.querySelectorAll('#theme-toggle, #mobile-theme-toggle');
  
  if (themeToggles.length > 0) {
    themeToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        if (toggle.tagName === 'A' || toggle.classList.contains('mobile-theme-toggle-link')) {
          e.preventDefault();
        }
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('git-reverse-theme', newTheme);
      });
    });
  }

});
