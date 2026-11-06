/* ==========================================================================
   portrait.js: halftone portrait with a "focus lens"
   --------------------------------------------------------------------------
   1. Shrink the photo to a small grid (one pixel per halftone cell).
   2. Read each cell's brightness (luminance).
   3. Draw a dot whose radius follows that brightness. That's halftone.
   4. Under the cursor, draw the real photo inside a circle (the lens).
   The real <img> stays in the HTML for screen readers and as a fallback.
   ========================================================================== */

export function initPortrait(figure, { reduced = false } = {}) {
  const canvas = figure.querySelector("canvas");
  const img = figure.querySelector("img");
  if (!canvas || !img) return;
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0, cell = 7, cols = 0, rows = 0, lum = null;
  let raf = 0, running = false;
  const lens = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0 };
  let colors = read();

  function read() {
    const cs = getComputedStyle(document.body);
    return { fg: cs.getPropertyValue("--fg").trim(), bg2: cs.getPropertyValue("--bg-2").trim(), signal: cs.getPropertyValue("--signal").trim() };
  }

  function setup() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cell = Math.max(5, Math.round(w / 70));
    cols = Math.ceil(w / cell); rows = Math.ceil(h / cell);
    const off = document.createElement("canvas");
    off.width = cols; off.height = rows;
    const o = off.getContext("2d", { willReadFrequently: true });
    o.drawImage(img, 0, 0, cols, rows); // the browser averages pixels for us
    const d = o.getImageData(0, 0, cols, rows).data;
    lum = new Float32Array(cols * rows);
    for (let i = 0; i < lum.length; i++) {
      const L = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      // Gamma < 1 lifts the shadows so darker skin tones and features keep
      // their detail instead of collapsing into tiny dots. Then a little contrast.
      lum[i] = Math.min(1, Math.max(0, (Math.pow(L, 0.55) - 0.1) * 1.22));
    }
    figure.classList.add("is-ready");
    draw(0);
  }

  function draw(time) {
    if (!lum) return;
    const t = time * 0.001;
    ctx.fillStyle = colors.bg2;
    ctx.fillRect(0, 0, w, h);

    // halftone dots (one path, one fill: fast)
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const L = lum[y * cols + x];
        const wave = reduced ? 1 : 1 + 0.1 * Math.sin(t * 1.4 + x * 0.18 + y * 0.12);
        const r = Math.pow(L, 1.1) * cell * 0.52 * wave;
        if (r < 0.35) continue;
        const cx = x * cell + cell / 2, cy = y * cell + cell / 2;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // the lens: real photo inside a circle that follows the pointer
    if (lens.r > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
      ctx.strokeStyle = colors.signal;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2); ctx.stroke();
      // crosshair ticks
      ctx.beginPath();
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
        ctx.moveTo(lens.x + dx * (lens.r + 4), lens.y + dy * (lens.r + 4));
        ctx.lineTo(lens.x + dx * (lens.r + 12), lens.y + dy * (lens.r + 12));
      });
      ctx.stroke();
    }
  }

  function frame(time) {
    lens.x += (lens.tx - lens.x) * 0.16;
    lens.y += (lens.ty - lens.y) * 0.16;
    lens.r += (lens.tr - lens.r) * 0.12;
    draw(time);
    if (running) raf = requestAnimationFrame(frame);
  }
  const play = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
  const pause = () => { running = false; cancelAnimationFrame(raf); };

  function moveLens(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    lens.tx = ((clientX - r.left) / r.width) * w;
    lens.ty = ((clientY - r.top) / r.height) * h;
    if (lens.r < 1) { lens.x = lens.tx; lens.y = lens.ty; }
    lens.tr = w * 0.26;
    if (reduced) { lens.x = lens.tx; lens.y = lens.ty; lens.r = lens.tr; draw(0); }
  }
  function closeLens() {
    lens.tr = 0;
    if (reduced) { lens.r = 0; draw(0); }
  }

  figure.addEventListener("pointerdown", (e) => moveLens(e.clientX, e.clientY), { passive: true });
  figure.addEventListener("pointermove", (e) => moveLens(e.clientX, e.clientY), { passive: true });
  figure.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") closeLens(); });

  // Smooth torch drag on touch screens without page scroll hijacking the gesture
  figure.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      if (t) moveLens(t.clientX, t.clientY);
    },
    { passive: true }
  );
  figure.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (!t) return;
      if (e.cancelable) e.preventDefault();
      moveLens(t.clientX, t.clientY);
    },
    { passive: false }
  );
  figure.addEventListener("touchend", closeLens, { passive: true });
  figure.addEventListener("touchcancel", closeLens, { passive: true });

  if (!reduced) new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause())).observe(figure);
  new ResizeObserver(() => setup()).observe(canvas);

  if (img.complete && img.naturalWidth) setup();
  else img.addEventListener("load", setup, { once: true });

  return { refresh() { colors = read(); draw(performance.now()); } };
}
