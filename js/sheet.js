/* ==========================================================================
   sheet.js: project figures (Screens / How it works) + case-study sheets
   --------------------------------------------------------------------------
   Figures: each project shows its real screens by default. "How it works"
   swaps in the live diagram, which only starts when you ask for it.

   Case studies: a native <dialog>. The View Transitions API makes the
   screenshot you clicked grow into the sheet's header image:
     1. name the clicked <img>  view-transition-name: shot
     2. document.startViewTransition(() => open the dialog)
     3. inside the callback, move the name to the sheet's header <img>
   The browser snapshots before/after and morphs one into the other.
   No support (or reduced motion)? The sheet simply opens.
   ========================================================================== */
import { featured } from "./data.js";
import { esc } from "./render.js";
import { mountVisual } from "./visuals.js";

/* ---------- figures ---------- */
export function initFigures({ reduced = false } = {}) {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".figure__tabs [data-view]");
    if (!btn) return;
    const fig = btn.closest(".figure");
    const view = btn.dataset.view;
    fig.dataset.view = view;
    fig.querySelectorAll(".figure__tabs [data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const canvas = fig.querySelector("canvas[data-diagram]");
    if (view === "how" && !canvas._diagram) canvas._diagram = mountVisual(canvas, canvas.dataset.diagram, { reduced });
    if (view === "screens" && canvas._diagram) { canvas._diagram.destroy(); canvas._diagram = null; }
  });
}

/* ---------- case-study sheet ---------- */
export function initSheet({ reduced = false } = {}) {
  const dialog = document.getElementById("sheet");
  if (!dialog) return;
  const canMorph = typeof document.startViewTransition === "function" && !reduced;
  let current = null;
  let visual = null;

  const cardShot = (id) => document.querySelector(`img[data-shot="${id}"]`);
  const sheetShot = () => dialog.querySelector("[data-sheet-shot]");

  function fill(p) {
    const links = [
      p.live && `<a class="btn btn--solid" href="${p.live}" target="_blank" rel="noopener">Live site ↗</a>`,
      p.repo ? `<a class="btn" href="${p.repo}" target="_blank" rel="noopener">Source ↗</a>` : `<span class="btn btn--ghost">Source · private</span>`,
    ].filter(Boolean).join("");
    const gallery = p.gallery
      .map((src) => `<div class="sheet__frame${/phone/.test(src) ? " is-phone" : ""}"><img src="${src}" alt="${esc(p.name)} screen" loading="lazy" /></div>`)
      .join("");

    dialog.innerHTML = `
      <div class="sheet__bar">
        <span class="mono sheet__crumb">Case study</span>
        <h2 class="sheet__name" id="sheet-title">${esc(p.name)}</h2>
        <button class="btn sheet__close" type="button" data-close>Close ✕</button>
      </div>
      <div class="sheet__body">
        <div class="sheet__frame sheet__hero"><img src="${p.shots.desk}" alt="${esc(p.name)}, main screen" data-sheet-shot /></div>
        <div class="sheet__intro">
          <div>
            <p class="mono sheet__meta">${p.tags.map(esc).join(" · ")} · ${esc(p.year)} · ${esc(p.role)}</p>
            <p class="sheet__pitch">${esc(p.pitch)}</p>
            <p class="sheet__summary">${esc(p.summary)}</p>
            <div class="project__links">${links}</div>
          </div>
          <div>
            <p class="mono sheet__label">Under the hood</p>
            <ul class="project__facts">${p.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
            <ul class="chips" aria-label="Tech stack">${p.stack.map((s) => `<li class="chip">${esc(s)}</li>`).join("")}</ul>
          </div>
        </div>
        <section class="sheet__how" aria-label="How it works">
          <p class="mono sheet__label">How it works · ${esc(p.caption)}</p>
          <div class="figure__frame sheet__screen"><canvas role="img" aria-label="Animated diagram: ${esc(p.caption)}"></canvas></div>
        </section>
        ${gallery ? `<section><p class="mono sheet__label">More screens</p><div class="sheet__gallery">${gallery}</div></section>` : ""}
        <p class="mono sheet__note">${esc(p.captureNote)}</p>
      </div>`;
  }

  function open(id) {
    const p = featured.find((f) => f.id === id);
    if (!p) return;
    current = p;
    const shot = cardShot(id);
    const show = () => {
      if (shot) shot.style.viewTransitionName = "";
      fill(p);
      if (canMorph && shot) sheetShot().style.viewTransitionName = "shot";
      dialog.showModal();
      dialog.scrollTop = 0;
      document.documentElement.classList.add("sheet-open");
      visual = mountVisual(dialog.querySelector("canvas"), p.visual, { reduced });
    };
    if (canMorph && shot) {
      shot.style.viewTransitionName = "shot";
      document.startViewTransition(show).finished.finally(() => {
        const img = sheetShot();
        if (img) img.style.viewTransitionName = "";
      });
    } else show();
  }

  function close() {
    if (!dialog.open) return;
    const shot = current && cardShot(current.id);
    const img = sheetShot();
    const hide = () => {
      if (img) img.style.viewTransitionName = "";
      dialog.close();
      if (canMorph && shot) shot.style.viewTransitionName = "shot";
    };
    // Morph back only while the header image is still on screen.
    if (canMorph && shot && img && dialog.scrollTop < 300) {
      img.style.viewTransitionName = "shot";
      document.startViewTransition(hide).finished.finally(() => { shot.style.viewTransitionName = ""; });
    } else hide();
  }

  dialog.addEventListener("close", () => {
    visual?.destroy();
    visual = null;
    document.documentElement.classList.remove("sheet-open");
  });
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); }); // Esc animates too
  dialog.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (btn) open(btn.dataset.open);
  });
}
