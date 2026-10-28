/* ==========================================================================
   render.js: turns the plain objects in data.js into HTML.
   --------------------------------------------------------------------------
   Pattern: each function returns a string of markup built with template
   literals, and mount() drops it into the matching [data-render="…"] slot.
   Any text that came from data goes through esc() first. It's good hygiene
   against XSS, even though here we write the data ourselves.
   ========================================================================== */
import { profile, stats, featured, archive, archiveFilters, incubating, layers, journey, marquee } from "./data.js";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const pad = (n) => String(n).padStart(2, "0");

function mount(name, html) {
  const el = document.querySelector(`[data-render="${name}"]`);
  if (el) el.innerHTML = html;
  return el;
}

/* --- About: stat counters (motion.js counts them up from 0) --- */
function renderStats() {
  return stats
    .map(
      (s) => `
      <div class="stat">
        <dt>${esc(s.label)}</dt>
        <dd><b data-count="${s.value}">${s.value}</b><span>${esc(s.suffix)}</span></dd>
      </div>`
    )
    .join("");
}

/* --- Marquee: the word list is repeated so the loop has no visible seam --- */
function renderMarquee() {
  const words = marquee.map((w) => `<span>${esc(w)}</span>`).join("");
  const alt = [...marquee].reverse().map((w) => `<span>${esc(w)}</span>`).join("");
  return `
    <div class="marquee__row" data-dir="-1">${words}${words}</div>
    <div class="marquee__row marquee__row--alt" data-dir="1">${alt}${alt}</div>`;
}

/* --- Selected work --- */
function renderFeatured() {
  return featured
    .map((p, i) => {
      const n = pad(i + 1);
      // Wrap each letter so the title can rise in letter by letter. Letters are
      // grouped per word in a no-wrap span, so a line never breaks mid-word.
      let j = 0;
      const title = p.name
        .split(" ")
        .map((word) => `<span class="wd">${[...word].map((ch) => `<span class="ch" style="--i:${j++}">${esc(ch)}</span>`).join("")}</span>`)
        .join(" ");
      const links = [
        p.live && `<a class="btn btn--solid magnetic" href="${p.live}" target="_blank" rel="noopener" data-cursor="Visit">Live site ↗</a>`,
        p.xray && `<button class="btn btn--xray magnetic" type="button" data-xray="${esc(p.id)}" data-cursor="X-Ray"><span class="btn__pulse" aria-hidden="true"></span>Architecture X-Ray</button>`,
        p.repo
          ? `<a class="btn magnetic" href="${p.repo}" target="_blank" rel="noopener" data-cursor="Code">Source ↗</a>`
          : `<span class="btn btn--ghost" title="This repository is private">Source · private</span>`,
      ]
        .filter(Boolean)
        .join("");

      return `
      <article class="project" id="${p.id}" aria-labelledby="${p.id}-title" data-telemetry-node="SYS_${n}:${esc(p.id.toUpperCase())}">
        <div class="project__text">
          <div class="project__meta mono">
            <span class="project__idx">${n} / ${pad(featured.length)}</span>
            <span>${p.tags.map(esc).join(" · ")}</span>
            <span>${esc(p.year)}</span>
          </div>
          <h3 class="project__title" id="${p.id}-title" aria-label="${esc(p.name)}">${title}</h3>
          <p class="project__pitch">${esc(p.pitch)}</p>
          <p class="project__summary">${esc(p.summary)}</p>
          <ul class="project__facts">${p.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
          <ul class="chips" aria-label="Tech stack">${p.stack.map((s) => `<li class="chip">${esc(s)}</li>`).join("")}</ul>
          <div class="project__links">${links}</div>
        </div>
        <figure class="figure">
          <div class="figure__frame">
            <canvas data-visual="${p.visual}" role="img" aria-label="Animated diagram: ${esc(p.caption)}"></canvas>
            <div class="figure__hud mono">
              <span class="figure__rec">Live figure</span>
              <button class="figure__inspect mono" type="button" data-xray="${esc(p.id)}" data-cursor="Blueprint">[ Inspect blueprint ↗ ]</button>
              <span>${esc(p.role)}</span>
            </div>
          </div>
          <figcaption class="mono"><span>Fig. ${n}</span><span>${esc(p.caption)}</span></figcaption>
        </figure>
      </article>`;
    })
    .join("");
}

/* --- Archive: filter chips + rows --- */
function renderFilters() {
  return archiveFilters
    .map((f) => {
      const count = f.key === "all" ? archive.length : archive.filter((a) => a.cat.split(" ").includes(f.key)).length;
      return `<button class="filter" type="button" data-filter="${f.key}" aria-pressed="${f.key === "all"}">${esc(f.label)}<sup>${count}</sup></button>`;
    })
    .join("");
}

function renderArchive() {
  return archive
    .map((a) => {
      const inner = `
        <span class="row__year mono">${a.year}</span>
        <span class="row__name">${esc(a.name)}${a.featured ? '<span class="star" title="Featured above">★</span>' : ""}</span>
        <span class="row__desc">${esc(a.desc)}</span>
        <span class="row__label mono">${esc(a.label)}</span>
        ${a.url ? '<span class="row__arrow" aria-hidden="true">↗</span>' : '<span class="row__private">Private</span>'}`;
      // data-* attributes feed the floating code preview in motion.js
      const data = `data-snippet="${esc(a.snippet)}" data-stack="${esc(a.stack)}" data-file="${esc(fileName(a))}"`;
      return `
      <li class="row" data-cat="${a.cat}">
        ${
          a.url
            ? `<a class="row__link" href="${a.url}" target="_blank" rel="noopener" ${data}>${inner}</a>`
            : `<div class="row__link" tabindex="0" ${data}>${inner}</div>`
        }
      </li>`;
    })
    .join("");
}

// A believable file path for the preview window title bar.
function fileName(a) {
  const slug = a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const main = a.cat.split(" ")[0];
  const ext = { laravel: "php", security: a.label.includes("Rust") ? "rs" : a.label === "Python" ? "py" : "ts", fintech: "py" }[main] || "ts";
  return `${slug}/core.${ext}`;
}

/* --- Stack layers --- */
function renderLayers() {
  return layers
    .map(
      (l, i) => `
      <div class="layer reveal" tabindex="0">
        <span class="layer__idx mono">L${i + 1}</span>
        <div>
          <h3 class="layer__name">${esc(l.name)}</h3>
          <span class="layer__note mono">${esc(l.note)}</span>
        </div>
        <ul class="layer__tools">${l.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <div class="layer__uses"><div><p class="mono">Ships in → ${l.uses.map((u) => `<b>${esc(u)}</b>`).join(" · ")}</p></div></div>
      </div>`
    )
    .join("");
}

/* --- Journey --- */
function renderJourney() {
  return journey
    .map(
      (m) => `
      <li class="moment reveal">
        <div class="moment__when">${esc(m.when)}</div>
        <div>
          <h3 class="moment__title">${esc(m.title)}</h3>
          <span class="moment__where mono">${esc(m.where)}</span>
          <p class="moment__text">${esc(m.text)}</p>
        </div>
      </li>`
    )
    .join("");
}

export function renderAll() {
  mount("stats", renderStats());
  mount("marquee", renderMarquee());
  mount("featured", renderFeatured());
  mount("filters", renderFilters());
  mount("archive", renderArchive());
  mount("incubating", `+ ${incubating} more repositories in incubation · ${esc(profile.githubHandle)} on GitHub`);
  mount("layers", renderLayers());
  mount("journey", renderJourney());
}
