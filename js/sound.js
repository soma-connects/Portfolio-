/* ==========================================================================
   sound.js: procedural WebAudio "Signal" sonification
   --------------------------------------------------------------------------
   Zero audio files. Every sound is synthesized on the fly with Web Audio API
   oscillators, noise buffers, and biquad filters:
   • lock()     filtered radio static resolving into a warm harmonic triad
   • tick()     10ms micro-impulse for tactile UI hover / keyboard steps
   • sweep()    resonant low-pass sweep for drawers and modals
   • ping()     clean two-tone telemetry confirmation
   • scatter()  subtle static shimmer when disturbing the hero particle field
   ========================================================================== */

let ctx = null;
let noiseBuf = null;
let enabled = false;
let lastTick = 0;
let lastScatter = 0;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Pre-generate 0.5s of white noise for radio-static synthesis
    const len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/* Radio static resolving into a clean A-add9 signal chord */
export function playSignalLock() {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac || !noiseBuf) return;
  const now = ac.currentTime;

  // 1. Brief band-pass noise burst ("tuning into carrier wave")
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuf;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(440, now + 0.16);
  filter.Q.value = 4.5;

  const nGain = ac.createGain();
  nGain.gain.setValueAtTime(0.001, now);
  nGain.gain.linearRampToValueAtTime(0.035, now + 0.03);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  noise.connect(filter).connect(nGain).connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.19);

  // 2. Warm harmonic signal lock (220Hz, 330Hz, 440Hz, 659.25Hz)
  [220, 329.63, 440, 659.25].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = i % 2 === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now + 0.04 + i * 0.025);

    const peak = 0.028 / (1 + i * 0.35);
    g.gain.setValueAtTime(0.0001, now + 0.04 + i * 0.025);
    g.gain.linearRampToValueAtTime(peak, now + 0.08 + i * 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.65 + i * 0.06);

    osc.connect(g).connect(ac.destination);
    osc.start(now + 0.04 + i * 0.025);
    osc.stop(now + 0.75 + i * 0.06);
  });
}

/* Tactile 10ms micro-click for hover & keyboard navigation */
export function playTick(freq = 980) {
  if (!enabled) return;
  const perfNow = performance.now();
  if (perfNow - lastTick < 32) return; // debounce rapid pointerovers
  lastTick = perfNow;

  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + 0.014);

  g.gain.setValueAtTime(0.018, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

  osc.connect(g).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.016);
}

/* Smooth filter sweep when opening/closing X-Ray drawer or Command Palette */
export function playSweep(open = true) {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(open ? 180 : 420, now);
  osc.frequency.exponentialRampToValueAtTime(open ? 460 : 150, now + 0.14);

  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.024, now + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc.connect(g).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

/* Two-tone telemetry confirmation (copy, command execution, X-Ray toggle) */
export function playPing(high = true) {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const notes = high ? [523.25, 783.99] : [587.33, 440];

  notes.forEach((f, idx) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now + idx * 0.055);
    g.gain.setValueAtTime(0.0001, now + idx * 0.055);
    g.gain.linearRampToValueAtTime(0.024, now + idx * 0.055 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.16);
    osc.connect(g).connect(ac.destination);
    osc.start(now + idx * 0.055);
    osc.stop(now + idx * 0.055 + 0.18);
  });
}

/* Subtle static grain when scattering hero particles */
export function playScatter(speed = 10) {
  if (!enabled || speed < 8) return;
  const perfNow = performance.now();
  if (perfNow - lastScatter < 85) return;
  lastScatter = perfNow;

  const ac = ensureCtx();
  if (!ac || !noiseBuf) return;
  const now = ac.currentTime;

  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(Math.min(3200, 600 + speed * 45), now);
  bp.Q.value = 6;

  const g = ac.createGain();
  const vol = Math.min(0.016, speed * 0.00045);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

  src.connect(bp).connect(g).connect(ac.destination);
  src.start(now, Math.random() * 0.3, 0.05);
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(next, { notify = true, onToast } = {}) {
  enabled = Boolean(next);
  document.querySelectorAll("[data-sound-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(enabled));
    const label = btn.querySelector("[data-sound-label]");
    if (label) label.textContent = enabled ? "Sound · On" : "Sound · Off";
  });
  if (enabled) {
    playSignalLock();
    if (notify) onToast?.("Signal audio online · WebAudio synth active ✳");
  } else if (notify) {
    onToast?.("Signal audio muted");
  }
  return enabled;
}

export function initSound({ onToast } = {}) {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-sound-toggle]");
    if (toggle) {
      setSoundEnabled(!enabled, { notify: true, onToast });
      return;
    }
    if (!enabled) return;
    if (e.target.closest("[data-filter], .nav__links a, .contact__copy")) {
      playTick(1120);
    }
  });

  // Subtle hover ticks on interactive rows, layers, and buttons
  document.addEventListener(
    "pointerover",
    (e) => {
      if (!enabled) return;
      if (e.target.closest(".row__link")) playTick(860);
      else if (e.target.closest(".layer")) playTick(740);
      else if (e.target.closest(".btn, .nav__links a, .cmd__item")) playTick(1040);
    },
    { passive: true }
  );

  // Subtle static shimmer when moving cursor fast across the hero canvas
  const heroCanvas = document.querySelector(".hero__canvas");
  let px = -9999, py = -9999;
  heroCanvas?.addEventListener(
    "pointermove",
    (e) => {
      if (!enabled) return;
      if (px > -9000) {
        const speed = Math.hypot(e.clientX - px, e.clientY - py);
        if (speed > 14) playScatter(speed);
      }
      px = e.clientX;
      py = e.clientY;
    },
    { passive: true }
  );

  return {
    toggle: () => setSoundEnabled(!enabled, { notify: true, onToast }),
    set: (v) => setSoundEnabled(v, { notify: true, onToast }),
    isEnabled: isSoundEnabled,
  };
}
