/* ============================================================
   Blood Drip Animation
   ============================================================ */
'use strict';

(function BloodModule() {
  function boot() {
    const layer = document.getElementById('bloodLayer');
    if (!layer) return;

    let enabled = true;
    let intervalId = null;
    let viewportW = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

    function updateViewport() {
      viewportW = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    }

    // Create a single drip element
    function createDrip() {
      if (!enabled) return;

      const drip = document.createElement('div');
      drip.className = 'blood-drop';

      const xPos = Math.random() * viewportW;
      const dripLen = 40 + Math.random() * 120; // 40–160px
      const duration = 2 + Math.random() * 3;   // 2–5s
      const delay = Math.random() * 1;          // 0–1s delay

      drip.style.left = `${xPos}px`;
      drip.style.setProperty('--drip-length', `${dripLen}px`);
      drip.style.setProperty('--drip-duration', `${duration}s`);
      drip.style.setProperty('--drip-delay', `${delay}s`);

      const width = 2 + Math.random() * 3;
      drip.style.width = `${width}px`;

      layer.appendChild(drip);

      const totalMs = (duration + delay) * 1000;
      setTimeout(() => {
        if (enabled) createPool(xPos, dripLen);
      }, totalMs * 0.7);

      setTimeout(() => {
        if (drip.parentNode) drip.parentNode.removeChild(drip);
      }, totalMs + 500);
    }

    function createPool(x, dripLen) {
      const pool = document.createElement('div');
      pool.className = 'blood-pool';
      const size = 8 + Math.random() * 12;
      pool.style.left = `${x - size / 2}px`;
      pool.style.top = `${dripLen}px`;
      pool.style.width = `${size}px`;
      pool.style.height = `${size / 2}px`;
      layer.appendChild(pool);

      setTimeout(() => {
        if (pool.parentNode) pool.parentNode.removeChild(pool);
      }, 1200);
    }

    function startDrips() {
      stopDrips();
      for (let i = 0; i < 5; i++) {
        setTimeout(createDrip, i * 300);
      }
      intervalId = setInterval(() => {
        if (enabled) {
          const count = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) {
            createDrip();
          }
        }
      }, 1400);
    }

    function stopDrips() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      layer.innerHTML = '';
    }

    function setEnabled(val) {
      enabled = Boolean(val);
      if (enabled) {
        startDrips();
      } else {
        stopDrips();
      }
    }

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', () => setTimeout(updateViewport, 150));

    startDrips();
    window.BloodDrip = { setEnabled };
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();
