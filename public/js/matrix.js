/* ============================================================
   Matrix Rain Animation
   ============================================================ */
'use strict';

(function MatrixModule() {
  const CHARS =
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*(){}[]<>/\\|~`+=_-;:,.!?';
  const charArray = CHARS.split('');
  const GLYPH_SIZE = 14;

  function boot() {
    const canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drops = [];
    let animId = null;
    let speed = 5; // 1–10
    let enabled = true;
    let userEnabled = true;
    let frameCount = 0;
    let viewW = 0;
    let viewH = 0;
    let dpr = 1;

    function resize(force = false) {
      const nextDpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
      const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      if (!force && w === viewW && h === viewH && nextDpr === dpr) return;

      viewW = w;
      viewH = h;
      dpr = nextDpr;

      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initDrops();
    }

    function initDrops() {
      const cols = Math.max(1, Math.floor(viewW / GLYPH_SIZE));
      const startingRange = Math.max(1, Math.ceil(viewH / GLYPH_SIZE));
      drops = new Array(cols).fill(0).map(() => Math.floor(Math.random() * -startingRange));
    }

    function tick() {
      frameCount++;

      if (enabled) {
        if (viewW === 0 || viewH === 0) resize(true);
        const skipRate = Math.max(1, 11 - speed);
        if (frameCount % skipRate === 0) {
          ctx.fillStyle = 'rgba(8, 8, 12, 0.14)';
          ctx.fillRect(0, 0, viewW, viewH);
          ctx.font = `${GLYPH_SIZE}px 'Cascadia Code', 'Fira Code', 'Consolas', monospace`;
          ctx.textBaseline = 'top';
          for (let i = 0; i < drops.length; i++) {
            const char = charArray[Math.floor(Math.random() * charArray.length)];
            const x = i * GLYPH_SIZE;
            const y = drops[i] * GLYPH_SIZE;
            const roll = Math.random();
            if (roll > 0.96) {
              ctx.fillStyle = '#e0ffe8';
            } else if (drops[i] % 6 === 0) {
              ctx.fillStyle = '#19ff4d';
            } else {
              ctx.fillStyle = '#00c93a';
            }
            ctx.fillText(char, x, y);
            if (y > viewH && Math.random() > 0.97) {
              drops[i] = Math.floor(Math.random() * -Math.ceil(viewH / GLYPH_SIZE));
            }
            drops[i]++;
          }
        }
      } else {
        ctx.clearRect(0, 0, viewW, viewH);
      }

      animId = requestAnimationFrame(tick);
    }

    function setEnabled(val) {
      userEnabled = val;
      if (!val) {
        enabled = false;
        ctx.clearRect(0, 0, viewW, viewH);
        pause();
      } else {
        enabled = true;
        resize(true);
        resume();
      }
    }

    function setSpeed(val) {
      speed = Math.max(1, Math.min(10, parseInt(val, 10) || 5));
    }

    function pause() {
      enabled = false;
      if (animId) cancelAnimationFrame(animId);
      animId = null;
    }

    function resume() {
      enabled = userEnabled;
      if (!animId) animId = requestAnimationFrame(tick);
    }

    function restart() {
      pause();
      resize(true);
      resume();
    }

    window.addEventListener('resize', () => resize(true));
    window.addEventListener('orientationchange', () => setTimeout(() => resize(true), 150));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pause();
      } else {
        animId = null;
        resize(true);
        resume();
      }
    });
    resize(true);
    animId = requestAnimationFrame(tick);

    // Expose controls globally
    window.MatrixRain = { setEnabled, setSpeed, restart };
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();
