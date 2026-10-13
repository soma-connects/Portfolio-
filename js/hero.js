/* ==========================================================================
   hero.js: "noise → signal" particle field
   --------------------------------------------------------------------------
   How it works:
   1. Draw the word on an invisible canvas and read its pixels back.
   2. Every filled pixel (on a grid) becomes a particle's HOME position.
   3. Each frame, a particle feels three forces:
        flow  = a drifting noise field                        (the "noise")
        home  = a spring pulling it back to its pixel         (the "signal")
        mouse = a push away from the cursor                   (you, being noise)
   4. `lock` (0 → 1) blends noise into signal. It ramps up after the
      preloader and back down as you scroll away, so the name dissolves.
   ========================================================================== */

const WORD = "PAULJI";

export function initHero(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  let particles = [];
  let size = 2;               // drawn size of one particle (CSS px)
  let running = false;
  let raf = 0;
  let lockStart = null;       // timestamp when the name starts assembling
  let scrollFade = 0;         // 0 at top of page, 1 once the hero has scrolled away
  let colors = readColors();
  const mouse = { x: -9999, y: -9999, px: -9999, py: -9999, speed: 0 };
  const glitch = { until: 0, next: 3500, y0: 0, y1: 0, dx: 0 };

  function readColors() {
    const cs = getComputedStyle(document.body);
    return {
      fg: cs.getPropertyValue("--fg").trim() || "#f2ede4",
      muted: cs.getPropertyValue("--muted").trim() || "#7d786f",
      signal: cs.getPropertyValue("--signal").trim() || "#ff5b1f",
    };
  }

  /* ---- 1 + 2: sample the word into home positions ---- */
  function build() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const o = off.getContext("2d", { willReadFrequently: true });

    // Fit the word to ~88% of the width, without getting taller than ~34% of the height.
    o.font = `700 100px Geist, system-ui, sans-serif`;
    const ratio = o.measureText(WORD).width / 100;
    const fontSize = Math.min((W * (W < 640 ? 0.9 : 0.86)) / ratio, H * 0.34);
    o.font = `700 ${fontSize}px Geist, system-ui, sans-serif`;
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillStyle = "#fff";
    const cy = H * (W < 640 ? 0.36 : 0.4);
    o.fillText(WORD, W / 2, cy);

    const data = o.getImageData(0, 0, W, H).data;

    // Count filled pixels first, so we can pick a grid step that gives a
    // particle budget the device can handle (fewer on small screens).
    let filled = 0;
    for (let i = 3; i < data.length; i += 16) if (data[i] > 128) filled += 4;
    const budget = W < 640 ? 1700 : W < 1100 ? 3000 : 4200;
    const step = Math.max(3, Math.round(Math.sqrt(filled / budget)));
    size = Math.max(1.4, step * 0.46);

    const old = particles;
    particles = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 128) particles.push(makeParticle(x, y, false));
      }
    }
    // Ambient particles never lock. They keep the background faintly alive.
    const ambient = Math.round(particles.length * 0.35);
    for (let i = 0; i < ambient; i++) particles.push(makeParticle(Math.random() * W, Math.random() * H, true));

    // On resize, keep current positions so the field doesn't "pop".
    for (let i = 0; i < particles.length && i < old.length; i++) {
      particles[i].x = Math.min(W, old[i].x);
      particles[i].y = Math.min(H, old[i].y);
    }

    if (reduced) {
      for (const p of particles) { p.x = p.hx; p.y = p.hy; }
      draw(performance.now(), true);
    }
  }

  function makeParticle(hx, hy, ambient) {
    return {
      hx, hy,
      x: Math.random() * W,
      y: Math.random() * H,
      vx: 0, vy: 0,
      seed: Math.random() * 1000,
      delay: hx / Math.max(W, 1), // assemble left → right, like a scan
      disturb: 0,
      hot: !ambient && Math.random() < 0.05, // a few particles glow orange
      ambient,
    };
  }

  /* ---- 3: physics ---- */
  function update(now) {
    const t = now * 0.001;
    const raw = lockStart == null ? 0 : Math.min(1, (now - lockStart) / 2000);
    const eased = 1 - Math.pow(1 - raw, 3); // easeOutCubic
    const lock = eased * (1 - scrollFade);

    const R = W < 640 ? 70 : 120;
    const R2 = R * R;
    const push = 0.9 + Math.min(mouse.speed / 18, 2.2);
    mouse.speed *= 0.9;

    for (const p of particles) {
      // Per-particle lock with a left→right sweep.
      let pl = p.ambient ? 0 : Math.max(0, Math.min(1, (lock - p.delay * 0.45) / 0.55));
      pl *= 1 - p.disturb;

      // Flow field: two layered sines make a slow, organic current.
      const a = Math.sin(p.x * 0.0035 + t * 0.5 + p.seed) * 2.2 + Math.cos(p.y * 0.0045 - t * 0.4);
      const flow = 0.11 * (1 - pl);
      p.vx += Math.cos(a) * flow;
      p.vy += Math.sin(a) * flow;

      // Spring home.
      p.vx += (p.hx - p.x) * 0.055 * pl;
      p.vy += (p.hy - p.y) * 0.055 * pl;

      // Cursor repulsion.
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < R2 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / R) * push;
        p.vx += (dx / d) * f * 2.4;
        p.vy += (dy / d) * f * 2.4;
        if (!p.ambient) p.disturb = Math.min(1, p.disturb + f * 0.35);
      }
      p.disturb *= 0.955;

      const damp = pl > 0.5 ? 0.78 : 0.93;
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx;
      p.y += p.vy;

      // Free particles wrap around the edges.
      if (pl < 0.05) {
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      }
    }

    // Occasional horizontal "glitch" slice. Tiny, but it sells the signal idea.
    if (now > glitch.next && lock > 0.9) {
      glitch.y0 = H * (0.25 + Math.random() * 0.3);
      glitch.y1 = glitch.y0 + 8 + Math.random() * 36;
      glitch.dx = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 26);
      glitch.until = now + 140;
      glitch.next = now + 4000 + Math.random() * 5000;
    }
  }

  /* ---- draw: batch by colour so the canvas changes fillStyle only 3 times ---- */
  function draw(now, still = false) {
    ctx.clearRect(0, 0, W, H);
    const g = !still && now < glitch.until;
    const s = size;
    const buckets = [[], [], []]; // 0 = bright, 1 = ambient, 2 = signal
    for (const p of particles) {
      const b = p.ambient ? 1 : p.hot || p.disturb > 0.22 ? 2 : 0;
      buckets[b].push(p);
    }
    const fills = [colors.fg, colors.muted, colors.signal];
    const alphas = [0.92, 0.35, 1];
    for (let b = 0; b < 3; b++) {
      ctx.globalAlpha = alphas[b];
      ctx.fillStyle = fills[b];
      ctx.beginPath();
      for (const p of buckets[b]) {
        const ox = g && p.y > glitch.y0 && p.y < glitch.y1 ? glitch.dx : 0;
        ctx.rect(p.x + ox, p.y, s, s);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    update(now);
    draw(now);
    raf = running ? requestAnimationFrame(frame) : 0;
  }

  function play() {
    if (reduced || running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  /* ---- input ---- */
  window.addEventListener(
    "pointermove",
    (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (mouse.px > -9000) mouse.speed = Math.hypot(x - mouse.px, y - mouse.py);
      mouse.px = mouse.x = x;
      mouse.py = mouse.y = y;
    },
    { passive: true }
  );
  document.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

  // Only animate while the hero is on screen.
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : pause())).observe(canvas);

  // Rebuild on resize (debounced). Mobile browsers fire resize when the URL
  // bar hides, so ignore small height-only changes.
  let lastW = 0, lastH = 0, timer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const r = canvas.getBoundingClientRect();
      if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 140) return;
      lastW = r.width; lastH = r.height;
      build();
    }, 180);
  });

  build();
  const r0 = canvas.getBoundingClientRect();
  lastW = r0.width; lastH = r0.height;

  return {
    /** Start assembling the word (called when the preloader finishes). */
    assemble() { lockStart = performance.now(); if (reduced) draw(0, true); },
    /** 0..1: how far the hero has scrolled away. */
    setScroll(v) { scrollFade = Math.max(0, Math.min(1, v)); },
    /** Re-read CSS colours (used by the easter egg). */
    refreshColors() { colors = readColors(); if (reduced) draw(0, true); },
    rebuild: build,
  };
}
