/* ==========================================================================
   main.js: the conductor
   --------------------------------------------------------------------------
   Boot order matters:
   1. renderAll()   build the data-driven HTML (work, archive, stack, journey)
   2. preloader     starts right away, covering steps 3–4
   3. fonts         wait for Geist, since the hero samples its letter shapes
   4. canvases      hero particles, project figures, portrait
   5. motion        scroll/pointer effects (needs the rendered HTML)
   6. reveal        preloader splits open, hero name assembles
   ========================================================================== */
import { renderAll } from "./render.js";
import { initHero } from "./hero.js";
import { initVisuals } from "./visuals.js";
import { initPortrait } from "./portrait.js";
import { initMotion } from "./motion.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* The preloader draws a noisy waveform that resolves into one spike, then
   "cuts" open. It plays once per browser session so repeat visits are instant. */
function runLoader() {
  const loader = document.querySelector(".loader");
  if (!loader) return Promise.resolve();
  let seen = false;
  try { seen = sessionStorage.getItem("pp-seen") === "1"; sessionStorage.setItem("pp-seen", "1"); } catch {}
  if (reduced || seen) { loader.classList.add("is-gone"); return Promise.resolve(); }

  const count = loader.querySelector(".loader__count");
  const canvas = loader.querySelector(".loader__wave");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = canvas.clientWidth || 320, H = canvas.clientHeight || 64;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const DUR = 1500;

  return new Promise((resolve) => {
    const t0 = performance.now();
    const draw = (now) => {
      const p = Math.min(1, (now - t0) / DUR);
      const e = 1 - Math.pow(1 - p, 2);
      count.textContent = String(Math.round(e * 100)).padStart(3, "0");
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = p < 1 ? "#f2ede4" : "#ff5b1f";
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const u = x / W;
        const noise = (Math.sin(x * 0.9 + now * 0.05) + Math.sin(x * 0.37 - now * 0.03)) * 0.5;
        const calm = 1 - e; // noise dies down as the signal is acquired
        const spike = Math.exp(-Math.pow((u - 0.5) * 22, 2)) * e; // one clean peak in the middle
        const y = H / 2 - noise * H * 0.3 * calm - spike * H * 0.42;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (p < 1) requestAnimationFrame(draw);
      else {
        setTimeout(() => {
          loader.classList.add("is-done");
          setTimeout(() => loader.classList.add("is-gone"), 1200);
          resolve();
        }, 220);
      }
    };
    requestAnimationFrame(draw);
  });
}

async function boot() {
  renderAll();
  const loaderDone = runLoader();

  // Load the exact font weight the hero samples, but never wait more than 2.5s.
  await Promise.race([document.fonts?.load("700 100px Geist").catch(() => {}), wait(2500)]);

  const heroCanvas = document.querySelector(".hero__canvas");
  const hero = heroCanvas ? initHero(heroCanvas, { reduced }) : null;
  const visuals = initVisuals({ reduced });
  const portraitEl = document.querySelector(".portrait");
  const portrait = portraitEl ? initPortrait(portraitEl, { reduced }) : null;

  initMotion({
    hero,
    reduced,
    onTheme: () => { hero?.refreshColors(); visuals.refresh(); portrait?.refresh(); },
  });

  await loaderDone;
  document.body.classList.remove("is-loading");
  hero?.assemble();
}

boot();
