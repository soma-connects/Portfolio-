/* ==========================================================================
   visuals.js: one live, hand-drawn diagram per featured project
   --------------------------------------------------------------------------
   Each SCENE is an object:
     loop   seconds before the animation repeats
     still  the moment to freeze on when the visitor prefers reduced motion
     draw(ctx, w, h, t, pal, k)   paint frame `t` (0 … loop)

   Scenes are written as pure functions of time `t`: no stored state, no
   accumulated physics. Given the same t, they always draw the same frame.
   That makes them easy to reason about, pause, resume and freeze.

   Positions are fractions of w/h, so every figure scales to any screen.
   ========================================================================== */

/* ---------- tiny maths kit ---------- */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));            // progress of t through [a, b] as 0..1
const eo = (x) => 1 - Math.pow(1 - x, 3);                     // ease-out cubic
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // ease-in-out cubic
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // deterministic "random"
const naira = (v) => "₦" + Math.round(v).toLocaleString("en-NG");

/* ---------- drawing kit: thin wrappers so scenes read like a description ---------- */
function makeKit(ctx, w, h, pal) {
  const fs = clamp(w * 0.0165, 8.5, 12.5); // base label size scales with the figure
  // never draw text smaller than 8px, whatever the scene asks for
  const font = (o) => `${o.weight || 400} ${Math.max(8, o.size || fs)}px ${o.serif ? pal.serif : o.sans ? pal.sans : pal.mono}`;
  return {
    fs,
    text(str, x, y, o = {}) {
      ctx.font = font(o);
      ctx.fillStyle = o.color || pal.muted;
      ctx.textAlign = o.align || "left";
      ctx.textBaseline = o.base || "alphabetic";
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.fillText(str, x, y);
      ctx.globalAlpha = 1;
    },
    width(str, o = {}) { ctx.font = font(o); return ctx.measureText(str).width; },
    line(x1, y1, x2, y2, color, lw = 1, dash = null, alpha = 1) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
    box(x, y, bw, bh, r = 0, o = {}) {
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.beginPath();
      if (r > 0 && ctx.roundRect) ctx.roundRect(x, y, bw, bh, Math.min(r, Math.abs(bw) / 2, Math.abs(bh) / 2));
      else ctx.rect(x, y, bw, bh);
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.stroke) {
        ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1; ctx.setLineDash(o.dash || []);
        ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    },
    circle(x, y, r, o = {}) {
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), o.a0 ?? 0, o.a1 ?? Math.PI * 2);
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1; ctx.stroke(); }
      ctx.globalAlpha = 1;
    },
    /* A rounded "pill" label, e.g. a money packet moving along a line. */
    pill(str, x, y, o = {}) {
      const size = o.size || fs;
      const tw = this.width(str, { size, weight: 500 });
      const ph = size * 2, pw = tw + size * 1.6;
      this.box(x - pw / 2, y - ph / 2, pw, ph, ph / 2, { fill: o.fill || pal.signal, alpha: o.alpha ?? 1 });
      this.text(str, x, y + size * 0.36, { align: "center", color: o.color || "#0c0c0e", size, weight: 500, alpha: o.alpha ?? 1 });
    },
  };
}

/* =========================================================================
   FIG 01 · NCLIPER
   chat velocity → spike over 5× baseline → 60s window → 9:16 dual-box render
   ========================================================================= */
const ncliper = {
  loop: 10,
  still: 8.8,
  draw(ctx, w, h, t, pal, k) {
    const p = w * 0.06;
    const x0 = p, x1 = w * 0.62, top = h * 0.22, base = h * 0.6;
    const N = 60, spike = 44, win = 8;
    const bw = (x1 - x0) / N;
    const chartH = base - top;
    const scanA = 0.3, scanB = 3.6;
    const play = seg(t, scanA, scanB);
    const px = x0 + (x1 - x0) * play;
    const tf = scanA + (scanB - scanA) * ((spike + 0.5) / N); // the moment the playhead hits the spike

    k.text("CHAT MSGS / 10S", x0, top - k.fs * 1.4);

    // threshold line
    const thY = base - chartH * 0.5;
    k.line(x0, thY, x1, thY, pal.muted, 1, [3, 4]);
    k.text("5× BASELINE", x0, thY - 6);

    // bars
    for (let i = 0; i < N; i++) {
      let v = 0.1 + 0.15 * rnd(i) + 0.07 * Math.sin(i * 0.45);
      if (i === spike) v = 0.98;
      else if (i === spike - 1) v = 0.4;
      else if (i === spike + 1) v = 0.62;
      else if (i === spike + 2) v = 0.33;
      const bx = x0 + i * bw + bw * 0.18;
      const scanned = bx < px;
      if (scanned) v *= 1 + 0.06 * Math.sin(t * 7 + i); // scanned bars "breathe" a little
      const bh = v * chartH;
      let col = scanned ? pal.fg : pal.muted, a = scanned ? 0.62 : 0.3;
      const inWin = i >= spike - win && i <= spike;
      if (t > tf + 0.4 && inWin) { col = pal.signal; a = 0.6; }
      if (i === spike && scanned) { col = pal.signal; a = 1; }
      k.box(bx, base - bh, bw * 0.64, bh, 0, { fill: col, alpha: a });
    }

    // time axis
    k.line(x0, base, x1, base, pal.muted, 1, null, 0.5);
    ["00:00", "01:00", "02:00", "03:00", "04:00"].forEach((s, j) => {
      const x = x0 + ((x1 - x0) * j) / 4;
      k.line(x, base, x, base + 5, pal.muted);
      k.text(s, x, base + k.fs * 1.9, { align: j === 0 ? "left" : j === 4 ? "right" : "center" });
    });

    // playhead
    if (play > 0 && play < 1) {
      k.line(px, top - 6, px, base, pal.signal, 1);
      k.box(px - 3, top - 10, 6, 6, 1, { fill: pal.signal });
    }

    // spike callout + pulse ring
    const spikeX = x0 + bw * (spike + 0.5);
    const sy = base - 0.98 * chartH;
    if (t > tf) {
      const ring = seg(t, tf, tf + 0.9);
      k.circle(spikeX, sy, 4 + 18 * ring, { stroke: pal.signal, alpha: 1 - ring, lw: 1.5 });
      k.text("+520%", spikeX + 10, sy + 4, { color: pal.signal, alpha: seg(t, tf, tf + 0.3), size: k.fs * 1.15, weight: 500 });
    }

    // 60-second clip window
    if (t > tf + 0.4) {
      const a = seg(t, tf + 0.4, tf + 0.8);
      const wx0 = x0 + (spike - win) * bw, wx1 = x0 + (spike + 1) * bw;
      k.box(wx0, top, wx1 - wx0, chartH, 0, { fill: pal.signal, alpha: 0.09 * a });
      k.line(wx0, top, wx0, base, pal.signal, 1, [2, 3], a);
      k.line(wx1, top, wx1, base, pal.signal, 1, [2, 3], a);
      k.text("60S CLIP", wx0 - 6, top + k.fs * 1.2, { color: pal.signal, alpha: a, align: "right" });
    }

    // the heuristic engine's checklist
    const rows = [
      ["01", "CHAT SPIKE", "+520%"],
      ["02", "AUDIO PEAK", "-4.1 DB"],
      ["03", "OCR TEXT", "VICTORY"],
      ["04", "GEMINI HOOK", "0.91"],
    ];
    rows.forEach((r, i) => {
      const ts = tf + 0.6 + i * 0.5;
      if (t < ts) return;
      const a = seg(t, ts, ts + 0.25);
      const y = h * 0.72 + i * k.fs * 2;
      k.text(r[0], x0, y, { color: pal.signal, alpha: a });
      k.text(r[1], x0 + k.fs * 2.8, y, { color: pal.fg, alpha: a });
      k.text(r[2], x0 + k.fs * 12.5, y, { alpha: a });
      k.text("✓", x1, y, { align: "right", color: i === 3 ? pal.signal : pal.live, alpha: a });
    });

    // 9:16 phone, facecam top third + gameplay bottom two-thirds
    const pt = seg(t, tf + 1.2, tf + 1.8);
    if (pt > 0) {
      const pw = Math.min(w * 0.24, h * 0.66 * (9 / 16));
      const ph = pw * (16 / 9);
      const pxp = w - p - pw;
      const pyp = Math.max(h * 0.15, (h - ph) / 2);
      const e = eo(pt);
      ctx.save();
      ctx.globalAlpha = e;
      ctx.translate(pxp + pw / 2, pyp + ph / 2);
      ctx.scale(0.92 + 0.08 * e, 0.92 + 0.08 * e);
      ctx.translate(-(pxp + pw / 2), -(pyp + ph / 2));

      const r = pw * 0.1, ins = Math.max(3, pw * 0.035);
      k.box(pxp, pyp, pw, ph, r, { fill: pal.bg, stroke: pal.fg, lw: 1.2, alpha: e });
      const ix = pxp + ins, iy = pyp + ins, iw = pw - ins * 2, ih = ph - ins * 2;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(ix, iy, iw, ih, r * 0.7) : ctx.rect(ix, iy, iw, ih);
      ctx.clip();

      // facecam
      const fh = ih / 3;
      k.box(ix, iy, iw, fh, 0, { fill: pal.bg2 });
      k.circle(ix + iw / 2, iy + fh * 0.45, fh * 0.18, { fill: pal.muted, alpha: 0.9 });
      k.circle(ix + iw / 2, iy + fh * 1.02, fh * 0.36, { fill: pal.muted, alpha: 0.9 });
      k.text("FACECAM", ix + 6, iy + k.fs * 1.3, { size: k.fs * 0.8, color: pal.fg2 });

      // gameplay: a perspective grid rushing toward the viewer
      const gy = iy + fh, gh = ih - fh;
      k.box(ix, gy, iw, gh, 0, { fill: "#141418" });
      const vx = ix + iw / 2, vy = gy + gh * 0.3;
      for (let i = 0; i < 7; i++) {
        const f = (i + ((t * 0.9) % 1)) / 7;
        const yy = vy + (gh * 0.7) * f * f;
        k.line(ix, yy, ix + iw, yy, pal.signal, 1, null, 0.15 + 0.4 * f);
      }
      for (let i = -4; i <= 4; i++) k.line(vx, vy, vx + i * iw * 0.35, gy + gh, pal.signal, 1, null, 0.25);
      k.circle(vx, gy + gh * 0.5, iw * 0.06, { stroke: pal.fg, lw: 1 });
      k.line(vx - iw * 0.1, gy + gh * 0.5, vx + iw * 0.1, gy + gh * 0.5, pal.fg, 1);
      k.line(vx, gy + gh * 0.5 - iw * 0.1, vx, gy + gh * 0.5 + iw * 0.1, pal.fg, 1);

      // captions, word by word
      const words = ["NO", "WAY", "HE", "HIT", "THAT"];
      const shown = Math.floor(seg(t, tf + 2, tf + 3.6) * words.length + 0.0001);
      if (shown > 0) {
        const fullW = k.width(words.join(" "), { sans: true, size: 100, weight: 800 });
        const size = Math.min(iw * 0.11, (iw * 0.86 * 100) / fullW);
        const str = words.slice(0, shown);
        const full = str.join(" ");
        const total = k.width(full, { sans: true, size, weight: 800 });
        let cx = ix + iw / 2 - total / 2;
        const cy = gy + gh * 0.84;
        str.forEach((wd, j) => {
          const ww = k.width(wd + " ", { sans: true, size, weight: 800 });
          k.text(wd, cx, cy, { sans: true, size, weight: 800, color: j === shown - 1 ? pal.signal : "#f2ede4" });
          cx += ww;
        });
      }
      ctx.restore();
      k.line(ix, iy + fh, ix + iw, iy + fh, pal.signal, 1.5);
      ctx.restore();

      // render progress under the phone
      const rp = seg(t, tf + 1.8, tf + 4.4);
      const by = pyp + ph + 12;
      if (by + k.fs * 2 < h) {
        k.box(pxp, by, pw, 3, 1.5, { fill: pal.muted, alpha: 0.4 * pt });
        k.box(pxp, by, pw * rp, 3, 1.5, { fill: pal.signal, alpha: pt });
        k.text(rp < 1 ? `RENDER ${Math.round(rp * 100)}%` : "9:16 · READY", pxp, by + k.fs * 1.8, { alpha: pt, color: rp < 1 ? pal.muted : pal.fg });
      }
    }
  },
};

/* =========================================================================
   FIG 02 · MY DATA KEEP
   available = max(0, tier% × lifetime profit − active debt)
   ========================================================================= */
const datakeep = {
  loop: 11,
  still: 9.6,
  draw(ctx, w, h, t, pal, k) {
    const p = w * 0.06;
    const narrow = w < 520;
    const top = h * 0.26, bot = h * 0.66, colH = bot - top;
    const profits = [180, 220, 150, 260, 240, 200, 310, 190, 280, 230, 260, 220, 300, 250, 270, 210, 290, 240, 260, 240]; // ₦4,800 total
    const buyAt = (i) => 0.3 + i * 0.24;
    let n = 0;
    while (n < profits.length && t >= buyAt(n)) n++;
    const profit = profits.slice(0, n).reduce((a, b) => a + b, 0);
    const tier = n >= 20 ? 2 : n >= 8 ? 1 : n >= 3 ? 0 : -1;
    const pct = [0.2, 0.25, 0.3][tier] || 0;
    const limit = pct * profit;
    const debt = 600 * eo(seg(t, 5.9, 6.6)) * (1 - eio(seg(t, 7.6, 8.7)));
    const avail = Math.max(0, limit - debt);

    // --- column A: lifetime profit ---
    const ax = p, aw = w * 0.17;
    k.text("LIFETIME PROFIT", ax, top - k.fs * 1.3);
    k.box(ax, top, aw, colH, 6, { stroke: pal.muted, alpha: 0.5 });
    const fillH = (profit / 5000) * colH;
    k.box(ax + 3, bot - fillH, aw - 6, Math.max(0, fillH - 3), 4, { fill: pal.fg, alpha: 0.16 });
    if (fillH > 4) k.line(ax + 3, bot - fillH, ax + aw - 3, bot - fillH, pal.fg, 2);
    for (let i = 0; i < n; i++) {
      const life = seg(t, buyAt(i), buyAt(i) + 0.5);
      if (life >= 1) continue;
      const level = (profits.slice(0, i).reduce((a, b) => a + b, 0) / 5000) * colH;
      const yy = lerp(top - 20, bot - level - 8, eio(life));
      k.box(ax + aw / 2 - 4, yy, 8, 8, 2, { fill: pal.signal, alpha: 1 - life * 0.5 });
      k.text(`+${naira(profits[i])}`, ax + aw + 8, yy + 8, { color: pal.signal, alpha: 1 - life, size: k.fs * 0.9 });
    }
    k.text(naira(profit), ax, bot + k.fs * 2.4, { sans: true, size: k.fs * 1.9, weight: 500, color: pal.fg });
    k.text(`${n} PURCHASES`, ax, bot + k.fs * 4);

    // --- column B: trust tiers ---
    const bx = w * 0.35, bwid = w * 0.3;
    k.text("TRUST TIER", bx, top - k.fs * 1.3);
    const tiers = [
      ["GOLD", "≥20 BUYS · ≥45D · ≥80", "30%"],
      ["SILVER", "≥8 BUYS · ≥21D · ≥55", "25%"],
      ["BRONZE", "≥3 BUYS · ≥7D · ≥30", "20%"],
    ];
    const rh = (colH - 16) / 3;
    tiers.forEach((tr, j) => {
      const idx = 2 - j; // 2 = gold
      const y = top + j * (rh + 8);
      const lit = tier >= idx, active = tier === idx;
      k.box(bx, y, bwid, rh, 8, {
        fill: active ? pal.signal : pal.fg,
        alpha: active ? 0.14 : lit ? 0.05 : 0,
      });
      k.box(bx, y, bwid, rh, 8, { stroke: active ? pal.signal : lit ? pal.fg : pal.muted, alpha: lit ? 0.9 : 0.35, lw: active ? 1.5 : 1 });
      k.text(tr[0], bx + 12, y + rh / 2 + (narrow ? 4 : -2), { sans: true, weight: 500, size: k.fs * 1.25, color: lit ? pal.fg : pal.muted });
      if (!narrow) k.text(tr[1], bx + 12, y + rh / 2 + k.fs * 1.3, { size: k.fs * 0.8 });
      k.text(tr[2], bx + bwid - 12, y + rh / 2 + k.fs * 0.5, { align: "right", sans: true, weight: 500, size: k.fs * 1.5, color: active ? pal.signal : lit ? pal.fg : pal.muted });
    });

    // --- column C: available reserve ---
    const cx = w * 0.72, cw = w - p - cx;
    k.text("AVAILABLE RESERVE", cx, top - k.fs * 1.3);
    k.box(cx, top, cw, colH, 6, { stroke: pal.muted, alpha: 0.5 });
    const scale = colH / 1600;
    const availH = avail * scale, debtH = Math.min(debt, limit) * scale;
    k.box(cx + 3, bot - availH, cw - 6, Math.max(0, availH - 3), 4, { fill: pal.signal, alpha: 0.9 });
    if (debtH > 1) {
      // hatched debt slice sitting on top of what's still available
      const dy = bot - availH - debtH;
      k.box(cx + 3, dy, cw - 6, debtH, 2, { stroke: pal.fg, alpha: 0.6, dash: [3, 3] });
      ctx.save(); ctx.beginPath(); ctx.rect(cx + 3, dy, cw - 6, debtH); ctx.clip();
      for (let s = -debtH; s < cw; s += 7) k.line(cx + s, dy + debtH, cx + s + debtH, dy, pal.fg, 1, null, 0.25);
      ctx.restore();
    }
    if (limit > 0) {
      const ly = bot - limit * scale;
      k.line(cx - 6, ly, cx + cw + 6, ly, pal.fg, 1, [4, 3], 0.7);
    }
    k.text(naira(avail), cx, bot + k.fs * 2.4, { sans: true, size: k.fs * 1.9, weight: 500, color: pal.signal });
    k.text(debt > 1 ? `DEBT ${naira(debt)}` : `LIMIT ${naira(limit)}`, cx, bot + k.fs * 4);

    // --- story beats ---
    if (t > 5.9 && t < 7.5) k.text("⚡ EMERGENCY: 1GB ON CREDIT", w / 2, h * 0.15, { align: "center", color: pal.signal, alpha: seg(t, 5.9, 6.2) * (1 - seg(t, 7.2, 7.5)) });
    if (t > 7.6 && t < 10.4) k.text("↺ NEXT TOP-UP REPAYS THE DEBT FIRST", w / 2, h * 0.15, { align: "center", color: pal.live, alpha: seg(t, 7.6, 7.9) * (1 - seg(t, 10.1, 10.4)) });

    // --- the rule, with live numbers ---
    const fy = h * 0.87;
    const pctS = `${Math.round(pct * 100)}%`;
    const rule = narrow
      ? `max(0, ${pctS} × ${Math.round(profit)} − ${Math.round(debt)}) = ${Math.round(avail)}`
      : `available = max(0, ${pctS} × ${naira(profit)} − ${naira(debt)}) = ${naira(avail)}`;
    k.text(rule, p, fy, { color: pal.fg, size: k.fs * 1.05 });
    k.text("AMOUNTS IN KOBO INTEGERS · FLOATS NEVER TOUCH MONEY", p, fy + k.fs * 1.9, { size: k.fs * 0.85 });
  },
};

/* =========================================================================
   FIG 03 · EFITMI
   pose landmarks + ISO card reference → calibrated body measurements
   ========================================================================= */
const efitmi = {
  loop: 10,
  still: 8.6,
  draw(ctx, w, h, t, pal, k) {
    const p = w * 0.06;
    const s = h * 0.96;
    const cx = w * 0.3, y0 = h * 0.14;
    const br = 1 + Math.sin(t * 2.2) * 0.005; // breathing
    const P = (dx, dy) => [cx + dx * s, y0 + dy * s * br];

    // card held flat against the chest (ISO 7810 ID-1: 85.6 × 53.98 mm)
    const cardW = 0.13 * s, cardH = cardW * (53.98 / 85.6);
    const [ccx, ccy] = P(0.035, 0.33);
    const cardX = ccx - cardW / 2, cardY = ccy - cardH / 2;

    const L = {
      head: P(0, 0.075), neck: P(0, 0.155),
      ls: P(-0.16, 0.21), rs: P(0.16, 0.21),
      le: P(-0.215, 0.42), re: P(0.2, 0.4),
      lw: P(-0.235, 0.6), rw: [cardX + cardW, cardY + cardH],
      lh: P(-0.11, 0.66), rh: P(0.11, 0.66),
    };
    const bones = [["neck", "ls"], ["neck", "rs"], ["ls", "le"], ["le", "lw"], ["rs", "re"], ["re", "rw"], ["ls", "lh"], ["rs", "rh"], ["lh", "rh"]];

    // 1. scan line reveals landmarks top to bottom
    const scanP = seg(t, 0.3, 2.2);
    const scanY = lerp(y0 - 10, y0 + 0.72 * s, scanP);
    const seen = (pt) => pt[1] <= scanY || scanP >= 1;

    // torso fill
    if (scanP >= 1) {
      ctx.globalAlpha = 0.05; ctx.fillStyle = pal.fg; ctx.beginPath();
      [L.ls, L.rs, L.rh, L.lh].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    // the card itself
    k.box(cardX, cardY, cardW, cardH, cardW * 0.07, { fill: pal.bg, stroke: pal.fg2, lw: 1 });
    k.box(cardX + cardW * 0.1, cardY + cardH * 0.32, cardW * 0.16, cardH * 0.26, 2, { fill: pal.muted });
    k.line(cardX + cardW * 0.1, cardY + cardH * 0.78, cardX + cardW * 0.7, cardY + cardH * 0.78, pal.muted, 1);

    bones.forEach(([a, b]) => { if (seen(L[a]) && seen(L[b])) k.line(L[a][0], L[a][1], L[b][0], L[b][1], pal.fg, 1, null, 0.55); });
    if (seen(L.head)) k.circle(L.head[0], L.head[1], 0.06 * s, { stroke: pal.fg, lw: 1, alpha: 0.7 });
    Object.entries(L).forEach(([name, pt]) => {
      if (name === "head" || !seen(pt)) return;
      k.circle(pt[0], pt[1], 3.2, { fill: pal.fg });
      k.circle(pt[0], pt[1], 6, { stroke: pal.fg, alpha: 0.3 });
    });
    if (scanP > 0 && scanP < 1) {
      const g = ctx.createLinearGradient(0, scanY - 40, 0, scanY);
      g.addColorStop(0, "rgba(255,91,31,0)"); g.addColorStop(1, "rgba(255,91,31,0.18)");
      ctx.fillStyle = g; ctx.fillRect(p, scanY - 40, w * 0.5, 40);
      k.line(p, scanY, w * 0.56, scanY, pal.signal, 1.2);
    }
    k.text("MEDIAPIPE POSE · ON-DEVICE", p, h * 0.94);

    // 2. calibration box snaps onto the card
    const cal = eio(seg(t, 2.4, 4));
    if (t > 2.4) {
      const sc = lerp(0.6, 1, cal);
      const bwid = cardW * sc, bh = cardH * sc;
      const bx = lerp(ccx + cardW * 0.25, ccx, cal) - bwid / 2;
      const by = lerp(ccy + cardH * 0.4, ccy, cal) - bh / 2;
      const done = t > 4;
      k.box(bx - 2, by - 2, bwid + 4, bh + 4, 4, { stroke: pal.signal, lw: 1.5, dash: done ? null : [4, 3] });
      [[bx, by], [bx + bwid, by], [bx, by + bh], [bx + bwid, by + bh]].forEach(([x, y]) => k.box(x - 4, y - 4, 8, 8, 1, { fill: pal.signal }));
      const lab = `85.6 MM = ${Math.round(lerp(85, 142, cal))} PX`;
      const lx = cardX - 10;
      const tw = k.width(lab, { size: k.fs * 0.85 });
      k.box(lx - tw - 8, ccy - k.fs, tw + 10, k.fs * 1.8, 4, { fill: pal.bg, alpha: 0.85 });
      k.text(lab, lx - 3, ccy + k.fs * 0.3, { align: "right", size: k.fs * 0.85, color: done ? pal.signal : pal.fg2 });
    }

    // 3. scale + measurements
    const rx = w * 0.6, rw = w - p - rx;
    if (t > 4.2) {
      const a = seg(t, 4.2, 4.6);
      k.text("SCALE", rx, h * 0.2, { alpha: a });
      k.text("cm/px = 8.56 / 142", rx, h * 0.2 + k.fs * 2.2, { color: pal.fg, sans: true, size: k.fs * 1.2, alpha: a });
      k.text("= 0.0603", rx, h * 0.2 + k.fs * 4, { color: pal.signal, sans: true, size: k.fs * 1.2, weight: 500, alpha: seg(t, 4.5, 4.8) });
    }
    const meas = [
      { name: "SHOULDER", v: 46.2, y: 0.175, half: 0.16, at: 5 },
      { name: "CHEST", v: 98.4, y: 0.29, half: 0.15, at: 5.6 },
      { name: "WAIST", v: 84.1, y: 0.52, half: 0.125, at: 6.2 },
      { name: "HIP", v: 101.3, y: 0.7, half: 0.13, at: 6.9, weak: true },
    ];
    meas.forEach((m, i) => {
      if (t < m.at) return;
      const a = seg(t, m.at, m.at + 0.35);
      const [, my] = P(0, m.y);
      const mx0 = cx - m.half * s, mx1 = cx + m.half * s;
      const reach = lerp(cx, mx1, eo(a)), reachL = lerp(cx, mx0, eo(a));
      const col = m.weak ? pal.muted : pal.signal;
      k.line(reachL, my, reach, my, col, 1.2, m.weak ? [3, 3] : null);
      k.line(mx0, my - 4, mx0, my + 4, col, 1, null, a);
      k.line(mx1, my - 4, mx1, my + 4, col, 1, null, a);

      // readout row
      const ry = h * 0.42 + i * k.fs * 3.2 + (m.weak ? k.fs * 1.4 : 0);
      if (m.weak) k.text("LOWER CONFIDENCE", rx, ry - k.fs * 2.2, { alpha: a, size: k.fs * 0.8, color: pal.muted });
      k.line(rx, ry + k.fs * 0.9, rx + rw, ry + k.fs * 0.9, pal.muted, 1, null, 0.3 * a);
      k.text(m.name, rx, ry, { alpha: a, color: m.weak ? pal.muted : pal.fg2 });
      const val = (m.v * eo(a)).toFixed(1);
      k.text(`${val} cm`, rx + rw - k.fs * 1.6, ry, { align: "right", alpha: a, sans: true, weight: 500, size: k.fs * 1.25, color: m.weak ? pal.muted : pal.fg });
      k.text(m.weak ? "~" : "✓", rx + rw, ry, { align: "right", alpha: a, color: m.weak ? pal.muted : pal.live });
    });
    if (t > 7.6) k.text("TORSO 3° · SQUARE ✓  PHOTO STAYS ON DEVICE", rx, h * 0.94, { alpha: seg(t, 7.6, 7.9), color: pal.live, size: k.fs * 0.8 });
  },
};

/* =========================================================================
   FIG 04 · VOICE PARTY ARCADE
   voice → pitch + transcript → points → power-ups on the roadmap
   ========================================================================= */
const voice = {
  loop: 10,
  still: 8.6,
  draw(ctx, w, h, t, pal, k) {
    const p = w * 0.06;
    const midY = h * 0.38, amp = h * 0.1;

    k.text("LIVE SPEECH-TO-TEXT", p, h * 0.17);

    // waveform
    const step = 5;
    for (let x = p; x < w - p; x += step) {
      const i = x / step;
      let e = Math.max(0, Math.sin(i * 0.09 - t * 2.6));
      e *= e;
      const jit = 0.45 + 0.55 * Math.abs(Math.sin(i * 1.37 + t * 11));
      const a = (0.06 + 0.94 * e) * jit * amp;
      k.line(x, midY - a, x, midY + a, pal.fg, 1.5, null, 0.28);
    }

    // pitch trace + PitchBird
    const pitchY = (x) => midY - amp * 0.9 * (0.55 * Math.sin(x * 0.012 - t * 2.1) + 0.3 * Math.sin(x * 0.027 - t * 3.3));
    ctx.strokeStyle = pal.signal; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = p; x <= w - p; x += 3) (x === p ? ctx.moveTo(x, pitchY(x)) : ctx.lineTo(x, pitchY(x)));
    ctx.stroke();
    const bx = w * 0.27, by = pitchY(bx);
    const r = clamp(w * 0.016, 5, 10);
    const flap = Math.sin(t * 18) * r * 0.6;
    ctx.fillStyle = pal.signal; ctx.beginPath();
    ctx.moveTo(bx - r * 0.2, by); ctx.lineTo(bx - r * 1.6, by - flap); ctx.lineTo(bx - r * 0.9, by + r * 0.3); ctx.fill();
    k.circle(bx, by, r, { fill: pal.signal });
    k.circle(bx + r * 0.35, by - r * 0.25, r * 0.22, { fill: "#0c0c0e" });
    const hz = Math.round(196 + 40 * Math.sin(t * 2.1));
    const pl = `PITCH ${hz} HZ`, plw = k.width(pl, { size: k.fs * 0.85 });
    k.box(bx - plw / 2 - 6, by - r - 10 - k.fs * 1.05, plw + 12, k.fs * 1.5, 4, { fill: pal.bg2, alpha: 0.9 });
    k.text(pl, bx, by - r - 10, { align: "center", color: pal.signal, size: k.fs * 0.85 });

    // phrases in three Nigerian languages, scored in turn
    const phrases = [
      ["“Sannu”", "HAUSA", "0.94"],
      ["“Kedu”", "IGBO", "0.91"],
      ["“Bawo ni”", "YORUBA", "0.97"],
    ];
    const per = 10 / 3;
    const j = Math.min(2, Math.floor(t / per));
    const lt = t - j * per;
    const pa = seg(lt, 0.3, 0.6) * (1 - seg(lt, per - 0.3, per));
    k.text(phrases[j][0], w - p, h * 0.2, { align: "right", serif: true, size: k.fs * 2.3, color: pal.fg, alpha: pa });
    if (lt > 1) k.text(`${phrases[j][1]} · ${phrases[j][2]} ✓`, w - p, h * 0.2 + k.fs * 1.8, { align: "right", color: pal.live, alpha: pa * seg(lt, 1, 1.3) });

    // roadmap board
    const T = 12;
    const tile = clamp(Math.min(w * 0.042, h * 0.058), 10, 30);
    const tx = (i) => p + tile / 2 + ((w - 2 * p - tile) * i) / (T - 1);
    const ty = (i) => h * 0.76 + Math.sin(i * 0.9 + 0.6) * h * 0.06;
    k.text("ROADMAP", p, h * 0.6);
    ctx.setLineDash([3, 4]); ctx.strokeStyle = pal.muted; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < T; i++) (i ? ctx.lineTo(tx(i), ty(i)) : ctx.moveTo(tx(i), ty(i)));
    ctx.stroke(); ctx.setLineDash([]);
    const specials = { 3: "BOOST", 6: "REWIND", 9: "DARE GUN", 11: "FINISH" };
    for (let i = 0; i < T; i++) {
      const sp = specials[i];
      k.box(tx(i) - tile / 2, ty(i) - tile / 2, tile, tile, 5, { fill: pal.bg2, stroke: sp ? pal.fg : pal.muted, alpha: sp ? 0.9 : 0.6 });
      if (sp) k.text(sp, tx(i), ty(i) + tile / 2 + k.fs * 1.4, { align: "center", size: k.fs * 0.75, color: pal.fg2 });
    }

    // players hop two tiles when their phrase scores
    const players = [
      { c: pal.signal, from: 1, pts: "+120 PTS → BOOST" },
      { c: pal.live, from: 4, pts: "+90 PTS → REWIND" },
      { c: pal.fg, from: 7, pts: "+150 PTS → DARE GUN" },
    ];
    players.forEach((pl, i) => {
      const at = i * per + 1.4;
      const hp = eio(seg(t, at, at + 0.7));
      const pos = pl.from + 2 * hp;
      const a0 = Math.floor(pos), a1 = Math.min(T - 1, a0 + 1), f = pos - a0;
      const x = lerp(tx(a0), tx(a1), f) + (i - 1) * tile * 0.12;
      const arc = Math.sin(hp * Math.PI) * h * 0.08;
      const y = lerp(ty(a0), ty(a1), f) - arc;
      k.circle(x, y, tile * 0.3, { fill: pl.c });
      if (t > at && t < at + 1.8) {
        const q = seg(t, at, at + 1.8);
        k.text(pl.pts, x, y - tile - q * 16, { align: "center", color: pl.c, alpha: 1 - q * q, size: k.fs * 0.85, weight: 500 });
      }
    });
  },
};

/* =========================================================================
   FIG 05 · N-RECLAIM
   scan treasury → verify (balance = 0 ∧ authority = bot) → close → rent home
   ========================================================================= */
const RENT = 0.00203928;
const reclaim = {
  loop: 10,
  still: 8.6,
  draw(ctx, w, h, t, pal, k) {
    const p = w * 0.06;
    const gx0 = p, gx1 = w * 0.63, gy0 = h * 0.2, gy1 = h * 0.74;
    const cols = 12, rows = 7;
    const cw = (gx1 - gx0) / cols, ch = (gy1 - gy0) / rows;
    const cs = Math.min(cw, ch) * 0.7;

    const cells = [];
    for (let i = 0; i < cols * rows; i++) {
      const r = rnd(i + 7);
      cells.push({ i, type: r < 0.27 ? "zombie" : r < 0.37 ? "foreign" : "active", c: i % cols, r: Math.floor(i / cols) });
    }
    const zombies = cells.filter((c) => c.type === "zombie");
    zombies.forEach((z, j) => (z.closeAt = 3.9 + j * (3.2 / zombies.length)));

    const scanX = gx0 + (gx1 - gx0 + cw) * seg(t, 0.3, 3.5);
    let scanned = 0;

    const tx = w * 0.69, tw = w - p - tx, ty = h * 0.2, th = h * 0.4;
    const tcy = ty + th * 0.62;
    const portX = tx + tw - 20, portY = ty + 20; // where reclaimed rent enters

    k.text("SPONSORED TOKEN ACCOUNTS", gx0, gy0 - k.fs * 1.2);
    cells.forEach((c) => {
      const x = gx0 + c.c * cw + (cw - cs) / 2;
      const y = gy0 + c.r * ch + (ch - cs) / 2;
      const isScanned = x + cs / 2 < scanX;
      if (isScanned) scanned++;
      if (!isScanned) { k.box(x, y, cs, cs, 3, { stroke: pal.muted, alpha: 0.35 }); return; }
      if (c.type === "active") {
        k.box(x, y, cs, cs, 3, { fill: pal.fg, alpha: 0.13 });
        k.circle(x + cs / 2, y + cs / 2, cs * 0.12, { fill: pal.fg, alpha: 0.6 });
      } else if (c.type === "foreign") {
        k.box(x, y, cs, cs, 3, { stroke: pal.muted, alpha: 0.6, dash: [2, 2] });
        k.text("×", x + cs / 2, y + cs / 2 + k.fs * 0.35, { align: "center", color: pal.muted, size: k.fs * 0.9 });
      } else {
        const sh = 1 - eo(seg(t, c.closeAt, c.closeAt + 0.35));
        if (sh > 0) {
          const ss = cs * sh;
          k.box(x + (cs - ss) / 2, y + (cs - ss) / 2, ss, ss, 3, { stroke: pal.signal, lw: 1.3, fill: pal.signal, alpha: 0.9 });
          if (sh > 0.6) k.text("0", x + cs / 2, y + cs / 2 + k.fs * 0.35, { align: "center", color: "#0c0c0e", size: k.fs * 0.9, weight: 500 });
        } else {
          k.box(x, y, cs, cs, 3, { stroke: pal.muted, alpha: 0.18, dash: [2, 3] });
        }
      }
    });

    // scan beam
    if (scanX > gx0 && scanX < gx1 + cw * 0.5) {
      const g = ctx.createLinearGradient(scanX - 50, 0, scanX, 0);
      g.addColorStop(0, "rgba(255,91,31,0)"); g.addColorStop(1, "rgba(255,91,31,0.16)");
      ctx.fillStyle = g; ctx.fillRect(scanX - 50, gy0 - 4, 50, gy1 - gy0 + 8);
      k.line(scanX, gy0 - 8, scanX, gy1 + 8, pal.signal, 1.3);
    }

    // rent flying home
    let arrived = 0, last = null;
    zombies.forEach((z) => {
      const a = z.closeAt, b = a + 0.9;
      if (t >= b) { arrived++; last = z; return; }
      if (t < a) return;
      const q = eio(seg(t, a, b));
      const sx = gx0 + z.c * cw + cw / 2, sy = gy0 + z.r * ch + ch / 2;
      // quadratic Bézier: start → control point (arched above) → port
      const mx = (sx + portX) / 2, my = Math.min(sy, portY) - h * 0.1;
      const x = (1 - q) * (1 - q) * sx + 2 * (1 - q) * q * mx + q * q * portX;
      const y = (1 - q) * (1 - q) * sy + 2 * (1 - q) * q * my + q * q * portY;
      k.box(x - 3, y - 3, 6, 6, 1, { fill: pal.signal });
    });

    // treasury
    k.box(tx, ty, tw, th, 10, { stroke: pal.fg, alpha: 0.5 });
    const glow = last && t < last.closeAt + 1.2 ? 1 - seg(t, last.closeAt + 0.9, last.closeAt + 1.2) : 0;
    k.circle(portX, portY, 7, { stroke: pal.signal, lw: 1.3 });
    k.circle(portX, portY, 3 + glow * 3, { fill: pal.signal, alpha: 0.4 + glow * 0.6 });
    k.text("TREASURY", tx + 12, ty + k.fs * 1.9);
    k.text("HdPM…Rnap", tx + 12, ty + k.fs * 3.5, { color: pal.fg2, size: k.fs * 0.9 });
    const val = (arrived * RENT).toFixed(8);
    const vs = Math.min(k.fs * 1.8, (tw - 24) / (val.length * 0.58));
    k.text(val, tx + 12, tcy + vs * 0.4, { sans: true, size: vs, weight: 500, color: pal.fg });
    k.text("SOL RECLAIMED", tx + 12, tcy + vs * 0.4 + k.fs * 1.7);
    if (last && t < last.closeAt + 1.5) {
      const q = seg(t, last.closeAt + 0.9, last.closeAt + 1.5);
      k.text(`+${RENT}`, tx + 12, ty + th - 10 - q * 8, { color: pal.signal, alpha: 1 - q, size: k.fs * 0.9 });
    }

    // live tallies
    const sy = ty + th + k.fs * 2.4;
    const closable = cells.filter((c, idx) => c.type === "zombie" && idx < cells.length && gx0 + c.c * cw + (cw - cs) / 2 + cs / 2 < scanX).length;
    k.text(`SCANNED   ${scanned}`, tx, sy, { color: pal.fg2 });
    k.text(`CLOSABLE  ${closable}`, tx, sy + k.fs * 1.8, { color: pal.signal });
    k.text(`SKIPPED   ${scanned - closable}`, tx, sy + k.fs * 3.6);

    // log
    const logs = zombies.filter((z) => t >= z.closeAt + 0.2).slice(-2);
    logs.forEach((z, j) => {
      const addr = "7xKp9fQmVb3RsT2nLcYe".slice(z.i % 10, (z.i % 10) + 4);
      k.text(`✓ CLOSE ${addr}…${String(z.i * 37).padStart(4, "0").slice(-4)}  +${RENT} SOL  BALANCE=0 ∧ AUTH=BOT`, gx0, h * 0.84 + j * k.fs * 1.8, {
        color: j === logs.length - 1 ? pal.fg2 : pal.muted, size: k.fs * 0.85,
      });
    });
  },
};

/* =========================================================================
   FIG 06 · LEZERV
   client pays → escrow holds → job done → artisan paid, commission split
   ========================================================================= */
const escrow = {
  loop: 10,
  still: 8.3,
  draw(ctx, w, h, t, pal, k) {
    const p = w * 0.06;
    const ny = h * 0.48;
    const C = [w * 0.15, ny], E = [w * 0.5, ny], A = [w * 0.85, ny], PL = [w * 0.5, h * 0.8];
    const R = clamp(Math.min(w * 0.06, h * 0.085), 14, 44);

    // status rail
    const steps = [["BOOKED", 0.3], ["FUNDED", 1.9], ["WORKING", 2.6], ["DONE", 4.9], ["PAID", 5.6]];
    const sx0 = p, sx1 = w - p, sy = h * 0.19;
    k.line(sx0, sy, sx1, sy, pal.muted, 1, null, 0.35);
    steps.forEach(([name, at], i) => {
      const x = lerp(sx0, sx1, i / (steps.length - 1));
      const on = t >= at;
      if (on && i > 0) k.line(lerp(sx0, sx1, (i - 1) / (steps.length - 1)), sy, x, sy, pal.signal, 1.5, null, seg(t, at, at + 0.3));
      k.circle(x, sy, 4.5, { fill: on ? pal.signal : pal.bg2, stroke: on ? pal.signal : pal.muted });
      k.text(name, x, sy + k.fs * 2, { align: i === 0 ? "left" : i === steps.length - 1 ? "right" : "center", color: on ? pal.fg : pal.muted, size: k.fs * 0.85 });
    });

    // rails between parties
    k.line(C[0] + R, ny, E[0] - R, ny, pal.muted, 1, [3, 4], 0.7);
    k.line(E[0] + R, ny, A[0] - R, ny, pal.muted, 1, [3, 4], 0.7);
    k.line(E[0], ny + R, PL[0], PL[1] - R * 0.7, pal.muted, 1, [3, 4], 0.7);

    // nodes
    const person = ([x, y]) => {
      k.circle(x, y, R, { fill: pal.bg2, stroke: pal.fg, alpha: 0.9 });
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.clip();
      k.circle(x, y - R * 0.2, R * 0.24, { fill: pal.fg2 });
      k.circle(x, y + R * 0.62, R * 0.46, { fill: pal.fg2 });
      ctx.restore();
    };
    person(C);
    person(A);
    // escrow vault with a shackle that locks while funds are held
    k.circle(E[0], E[1], R, { fill: pal.bg2, stroke: t > 1.9 && t < 5.6 ? pal.signal : pal.fg, lw: t > 1.9 && t < 5.6 ? 1.6 : 1 });
    const lockY = E[1] + R * 0.05;
    const shut = t > 1.9 && t < 5.6 ? 1 : 0;
    const lift = (1 - shut) * R * 0.18;
    k.circle(E[0], lockY - R * 0.12 - lift, R * 0.24, { stroke: pal.fg, lw: 2, a0: Math.PI, a1: Math.PI * 2 });
    k.line(E[0] - R * 0.24, lockY - R * 0.12 - lift, E[0] - R * 0.24, lockY - lift * 0.2, pal.fg, 2);
    k.line(E[0] + R * 0.24, lockY - R * 0.12, E[0] + R * 0.24, lockY, pal.fg, 2);
    k.box(E[0] - R * 0.38, lockY, R * 0.76, R * 0.5, 3, { fill: shut ? pal.signal : pal.fg });
    // platform
    k.circle(PL[0], PL[1], R * 0.7, { fill: pal.bg2, stroke: pal.fg, alpha: 0.8 });
    k.text("%", PL[0], PL[1] + R * 0.25, { align: "center", sans: true, size: R * 0.7, weight: 500, color: pal.fg });

    const lab = (str, [x, y], r = R) => k.text(str, x, y + r + k.fs * 1.9, { align: "center" });
    lab("CLIENT", C); lab("ESCROW", E); lab("ARTISAN", A); lab("PLATFORM", PL, R * 0.7);

    // artisan progress ring while the job is happening
    if (t > 2.6) {
      const q = seg(t, 2.6, 4.9);
      k.circle(A[0], A[1], R + 6, { stroke: pal.signal, lw: 2, a0: -Math.PI / 2, a1: -Math.PI / 2 + Math.PI * 2 * q, alpha: t < 9.4 ? 1 : 0 });
      if (t < 4.9) k.text("DEEP CLEAN · LEKKI", A[0], A[1] - R - 14, { align: "center", size: k.fs * 0.8, color: pal.fg2 });
    }

    // money in motion
    const move = (from, to, a, b) => {
      const q = eio(seg(t, a, b));
      return [lerp(from[0], to[0], q), lerp(from[1], to[1], q)];
    };
    if (t > 0.4 && t < 1.9) { const [x, y] = move(C, E, 0.4, 1.9); k.pill("₦25,000", x, y - R - 16); }
    if (t >= 1.9 && t < 5.6) k.pill("₦25,000 HELD", E[0], E[1] - R - 16, { fill: pal.fg, color: pal.bg });
    if (t >= 5.6 && t < 7.2) {
      const [ax, ay] = move(E, A, 5.6, 7.1);
      k.pill("₦22,500", ax, ay - R - 16);
      const [px, py] = move([E[0], E[1] + R], [PL[0] + R * 2.6, PL[1]], 5.6, 7.1);
      k.pill("₦2,500", px + R * 1.2, py, { fill: pal.fg, color: pal.bg });
    }
    if (t >= 7.1) {
      const a = seg(t, 7.1, 7.4);
      k.text("+₦22,500", A[0], A[1] + R + k.fs * 3.6, { align: "center", color: pal.signal, alpha: a, weight: 500 });
      k.text("+₦2,500 COMMISSION", PL[0] + R * 1.2, PL[1] + k.fs * 0.35, { color: pal.fg2, alpha: a, size: k.fs * 0.85 });
    }

    // two-sided reviews
    if (t > 7.4) {
      const a = seg(t, 7.4, 7.8);
      k.text("★★★★★", C[0], C[1] - R - 14, { align: "center", color: pal.signal, alpha: a, sans: true, size: k.fs * 1.1 });
      k.text("★★★★★", A[0], A[1] - R - 14, { align: "center", color: pal.signal, alpha: a, sans: true, size: k.fs * 1.1 });
      k.text("TWO-SIDED REVIEWS", w / 2, h * 0.31, { align: "center", alpha: a, size: k.fs * 0.85 });
    }
  },
};

export const SCENES = { ncliper, datakeep, efitmi, voice, reclaim, escrow };

/* =========================================================================
   RUNNER: sizes each canvas, plays it only while on screen, and fades
   between loops so the restart never looks like a glitch.
   ========================================================================= */
function readPalette() {
  const cs = getComputedStyle(document.body);
  const v = (n, f) => cs.getPropertyValue(n).trim() || f;
  return {
    bg: v("--bg", "#08080a"), bg2: v("--bg-2", "#101013"), fg: v("--fg", "#f2ede4"), fg2: v("--fg-2", "#bdb8ae"),
    muted: v("--muted", "#7d786f"), signal: v("--signal", "#ff5b1f"), live: v("--live", "#3ddc97"),
    mono: '"Geist Mono", ui-monospace, monospace', sans: "Geist, system-ui, sans-serif", serif: '"Instrument Serif", Georgia, serif',
  };
}

export function initVisuals({ reduced = false } = {}) {
  let pal = readPalette();
  const runners = [...document.querySelectorAll("canvas[data-visual]")]
    .map((c) => createRunner(c, SCENES[c.dataset.visual], () => pal, reduced))
    .filter(Boolean);
  return {
    refresh() { pal = readPalette(); runners.forEach((r) => r.redraw()); },
  };
}

function createRunner(canvas, scene, getPal, reduced) {
  if (!scene) return null;
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, raf = 0, running = false, clock = 0, last = 0;

  function size() {
    // clientWidth ignores CSS transforms (the reveal animation scales the canvas)
    w = canvas.clientWidth; h = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function render(t) {
    if (!w || !h) return;
    const pal = getPal();
    ctx.clearRect(0, 0, w, h);
    scene.draw(ctx, w, h, t, pal, makeKit(ctx, w, h, pal));
    if (!reduced) {
      const veil = Math.max(1 - seg(t, 0, 0.45), seg(t, scene.loop - 0.55, scene.loop));
      if (veil > 0) { ctx.globalAlpha = veil; ctx.fillStyle = pal.bg2; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
    }
  }
  const now = () => (reduced ? scene.still : clock % scene.loop);
  function frame(ts) {
    clock += Math.min(0.05, (ts - last) / 1000); // cap dt so a background tab doesn't jump ahead
    last = ts;
    render(clock % scene.loop);
    if (running) raf = requestAnimationFrame(frame);
  }
  function play() { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function pause() { running = false; cancelAnimationFrame(raf); }

  new ResizeObserver(() => { size(); render(now()); }).observe(canvas);
  new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause()), { rootMargin: "60px" }).observe(canvas);
  size();
  render(now());
  return { redraw: () => render(now()) };
}
