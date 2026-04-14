/* ============================================================
   Matrix Rain Animation
   ============================================================ */
'use strict';

(function MatrixModule() {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Characters used in the rain
  const CHARS =
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*(){}[]<>/\\|~`+=_-;:,.!?';

  const charArray = CHARS.split('');

  let drops = [];
  let animId = null;
  let speed = 5; // 1–10
  let enabled = true;
  let frameCount = 0;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    initDrops();
  }

  function initDrops() {
    const cols = Math.floor(canvas.width / 16);
    drops = [];
    for (let i = 0; i < cols; i++) {
      drops[i] = Math.floor(Math.random() * -canvas.height / 16);
    }
  }

  function tick() {
    frameCount++;

    if (enabled) {
      const skipRate = Math.max(1, 11 - speed);
      if (frameCount % skipRate === 0) {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px monospace';
        for (let i = 0; i < drops.length; i++) {
          const char = charArray[Math.floor(Math.random() * charArray.length)];
          const x = i * 16;
          const y = drops[i] * 16;
          if (Math.random() > 0.95) {
            ctx.fillStyle = '#ffffff';
          } else if (drops[i] % 5 === 0) {
            ctx.fillStyle = '#00aa2a';
          } else {
            ctx.fillStyle = '#00ff41';
          }
          ctx.fillText(char, x, y);
          if (y > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    animId = requestAnimationFrame(tick);
  }

  function setEnabled(val) {
    enabled = val;
    if (!val) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function setSpeed(val) {
    speed = Math.max(1, Math.min(10, parseInt(val, 10) || 5));
  }

  window.addEventListener('resize', resize);
  resize();
  animId = requestAnimationFrame(tick);

  // Expose controls globally
  window.MatrixRain = { setEnabled, setSpeed };
})();

