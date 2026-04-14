/* ============================================================
   Blood Drip Animation
   ============================================================ */
'use strict';

(function BloodModule() {
  const layer = document.getElementById('bloodLayer');
  if (!layer) return;

  let enabled = true;
  let intervalId = null;

  // Create a single drip element
  function createDrip() {
    if (!enabled) return;

    const drip = document.createElement('div');
    drip.className = 'blood-drop';

    // Random position along the top
    const xPos = Math.random() * window.innerWidth;
    const dripLen = 40 + Math.random() * 120; // 40–160px
    const duration = 2 + Math.random() * 3;    // 2–5s
    const delay = Math.random() * 1;            // 0–1s delay

    drip.style.left = `${xPos}px`;
    drip.style.setProperty('--drip-length', `${dripLen}px`);
    drip.style.setProperty('--drip-duration', `${duration}s`);
    drip.style.setProperty('--drip-delay', `${delay}s`);

    // Width varies slightly
    const width = 2 + Math.random() * 3;
    drip.style.width = `${width}px`;

    layer.appendChild(drip);

    // Create pool at the end of the drip
    const totalMs = (duration + delay) * 1000;
    setTimeout(() => {
      if (enabled) createPool(xPos, dripLen);
    }, totalMs * 0.7);

    // Remove element after animation completes
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
    if (intervalId) clearInterval(intervalId);
    // Create initial burst
    for (let i = 0; i < 5; i++) {
      setTimeout(createDrip, i * 400);
    }
    // Ongoing drips
    intervalId = setInterval(() => {
      if (enabled) {
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          createDrip();
        }
      }
    }, 1500);
  }

  function stopDrips() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    // Clean up existing drips
    layer.innerHTML = '';
  }

  function setEnabled(val) {
    enabled = val;
    if (val) {
      startDrips();
    } else {
      stopDrips();
    }
  }

  // Start
  startDrips();

  // Expose controls
  window.BloodDrip = { setEnabled };
})();
