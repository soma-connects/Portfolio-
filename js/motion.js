/* ==========================================================================
   motion.js: everything that moves in response to YOU
   --------------------------------------------------------------------------
   Two tools do most of the work here:
   • IntersectionObserver: the browser tells us when an element enters the
     screen, so we don't have to measure everything on every scroll.
   • One rAF loop (tick) reads scrollY once per frame and updates all the
     scroll-linked effects together. Reading layout once and then writing
     styles avoids "layout thrashing" (forced reflows in a loop).
   ========================================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/* ---------- text splitting ----------
   Wraps every word in spans so CSS can animate words individually.
   It walks child nodes so <em> and <br> survive the split. */
function splitWords(el, { mask = true } = {}) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(" ")); return; }
          const outer = document.createElement("span");
          if (mask) {
            // <span class="word"> clips; the inner span slides up from below it
            outer.className = "word";
            const inner = document.createElement("span");
            inner.textContent = part;
            inner.style.setProperty("--i", i++);
            outer.append(inner);
          } else {
            outer.className = "w";
            outer.textContent = part;
            i++;
          }
          frag.append(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        walk(child);
      }
    });
  };
  walk(el);
  return i;
}

/* ---------- one-shot reveals ---------- */
function initReveals() {
  $$(".split").forEach((el) => splitWords(el));
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }),
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
  );
  $$(".reveal, .split, .project, .row, .footer__name").forEach((el) => io.observe(el));
}

/* ---------- counters ---------- */
function initCounters() {
  const els = $$("[data-count]");
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = 1800;
    const step = (now) => {
      const p = clamp((now - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(2, -10 * p))); // easeOutExpo
      if (p < 1) requestAnimationFrame(step); else el.textContent = end;
    };
    el.textContent = 0;
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

/* ---------- custom cursor ---------- */
function initCursor() {
  if (!matchMedia("(pointer: fine)").matches) return;
  const root = $(".cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring"), label = $(".cursor__label");
  if (!root) return;
  document.documentElement.classList.add("has-cursor");
  let mx = -100, my = -100, rx = -100, ry = -100;
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    root.classList.remove("is-hidden");
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => root.classList.add("is-hidden"));
  document.addEventListener("pointerover", (e) => {
    // Inside [data-cursor-off] something else acts as the cursor (the portrait lens).
    root.classList.toggle("is-off", !!e.target.closest("[data-cursor-off]"));
    const t = e.target.closest("[data-cursor], a, button, .row__link, .layer");
    const text = t?.dataset.cursor || "";
    root.classList.toggle("has-label", !!text);
    root.classList.toggle("is-hover", !!t && !text);
    label.textContent = text;
  });
  const loop = () => {
    rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2; // lerp = the ring lags behind, feels physical
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
}

/* ---------- magnetic buttons ---------- */
function initMagnetic() {
  if (!matchMedia("(pointer: fine)").matches) return;
  $$(".magnetic").forEach((el) => {
    el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)";
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.22}px, ${y * 0.35}px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
}

/* ---------- archive: filters + floating code preview ---------- */
function initArchive() {
  const rows = $$(".row");
  $(".filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    const key = btn.dataset.filter;
    $$(".filter").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    let n = 0;
    rows.forEach((r) => {
      const show = key === "all" || r.dataset.cat.split(" ").includes(key);
      r.classList.toggle("is-hidden", !show);
      if (show) {
        // replay the entrance, staggered
        r.classList.remove("is-in");
        r.style.transitionDelay = `${n++ * 45}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => r.classList.add("is-in")));
      }
    });
  });

  const preview = $(".preview");
  if (!preview || !matchMedia("(pointer: fine)").matches) return;
  const code = $(".preview__code"), file = $(".preview__file"), meta = $(".preview__meta");
  let on = false, x = 0, y = 0, tx = 0, ty = 0, raf = 0;
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const hl = (s) => esc(s).replace(/\b(if|const|await|return|import|from|max|pub|let|async|def)\b/g, '<span class="k">$1</span>');
  const loop = () => {
    x += (tx - x) * 0.18; y += (ty - y) * 0.18;
    preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (on || Math.abs(tx - x) > 0.5) raf = requestAnimationFrame(loop);
  };
  const list = $(".archive__list");
  list.addEventListener("pointerover", (e) => {
    const link = e.target.closest(".row__link");
    if (!link) return;
    code.innerHTML = hl(link.dataset.snippet || "");
    file.textContent = link.dataset.file || "";
    meta.textContent = link.dataset.stack || "";
    if (!on) { on = true; preview.classList.add("is-on"); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
  });
  list.addEventListener("pointerleave", () => { on = false; preview.classList.remove("is-on"); });
  window.addEventListener("pointermove", (e) => {
    const flip = e.clientX + 380 > innerWidth;
    tx = flip ? e.clientX - 364 : e.clientX + 24;
    ty = Math.min(e.clientY + 24, innerHeight - 180);
    if (!on) { x = tx; y = ty; }
  }, { passive: true });
}

/* ---------- mobile menu ---------- */
function initMenu() {
  const btn = $(".nav__menu"), menu = $("#menu");
  if (!btn || !menu) return;
  const set = (open) => {
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Close" : "Menu";
    document.body.style.overflow = open ? "hidden" : "";
  };
  btn.addEventListener("click", () => set(!menu.classList.contains("is-open")));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => set(false)));
  document.addEventListener("keydown", (e) => e.key === "Escape" && set(false));
}

/* ---------- toast ---------- */
let toastTimer = 0;
export function toast(msg) {
  const el = $(".toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2600);
}

function initCopy() {
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      toast("Email copied. Talk soon ✳");
    } catch {
      toast(b.dataset.copy);
    }
  }));
}

/* ---------- live clock (West Africa Time) ---------- */
function initClock() {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const els = $$("[data-clock]");
  const tick = () => { const s = fmt.format(new Date()); els.forEach((el) => (el.textContent = s)); };
  tick();
  setInterval(tick, 1000);
}

/* ---------- active nav link ---------- */
function initNavSpy() {
  const links = new Map($$("[data-nav]").map((a) => [a.dataset.nav, a]));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a, id) => a.classList.toggle("is-active", id === e.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main > section[id]").forEach((s) => io.observe(s));
}

/* ---------- the scroll loop ---------- */
function initScroll({ hero, reduced }) {
  const bar = $(".progress");
  const manifesto = $(".manifesto");
  const words = manifesto ? (splitWords(manifesto, { mask: false }), $$(".w", manifesto)) : [];
  const stack = $("#stack");
  const timeline = $(".timeline"), fill = $(".timeline__fill"), moments = $$(".moment");
  const marqueeRows = $$(".marquee__row").map((el) => ({ el, dir: +el.dataset.dir || -1, x: 0, w: 0 }));
  const measure = () => marqueeRows.forEach((r) => (r.w = r.el.scrollWidth / 2));
  measure();
  window.addEventListener("resize", measure);

  let lastY = scrollY, velocity = 0, theme = "";

  const tick = () => {
    // ---- READ: measure everything first ----
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const mRect = manifesto?.getBoundingClientRect();
    const sRect = stack?.getBoundingClientRect();
    const tRect = timeline?.getBoundingClientRect();
    const momentTops = moments.map((m) => m.getBoundingClientRect().top);
    velocity = velocity * 0.85 + (y - lastY) * 0.15;
    lastY = y;

    // ---- WRITE: then change styles and classes ----
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    hero?.setScroll(y / (vh * 0.85));

    // manifesto: light up words as you read down the page
    if (mRect && words.length) {
      const p = reduced ? 1 : clamp((vh * 0.82 - mRect.top) / (mRect.height + vh * 0.3));
      const lit = Math.floor(p * words.length * 1.05);
      words.forEach((w, i) => w.classList.toggle("on", i < lit));
    }

    // scene change: cream theme while the Stack section owns the middle of the screen
    if (sRect) {
      const next = sRect.top < vh * 0.5 && sRect.bottom > vh * 0.5 ? "light" : "dark";
      if (next !== theme) { theme = next; document.body.dataset.theme = next; }
    }

    // timeline fill + lit nodes
    if (tRect) {
      fill.style.transform = `scaleY(${clamp((vh * 0.6 - tRect.top) / tRect.height)})`;
      moments.forEach((m, i) => m.classList.toggle("is-lit", momentTops[i] < vh * 0.6));
    }

    // marquee: drifts on its own, speeds up (and flips) with scroll velocity
    if (!reduced) {
      const boost = clamp(Math.abs(velocity) * 0.25, 0, 14);
      const sign = velocity < -0.5 ? -1 : 1;
      marqueeRows.forEach((row) => {
        row.x += row.dir * sign * (0.6 + boost);
        if (row.w) row.x = ((row.x % row.w) - row.w) % row.w; // wrap seamlessly
        row.el.style.transform = `translate3d(${row.x}px,0,0)`;
      });
    }
    requestAnimationFrame(tick);
  };
  tick();
}

/* ---------- easter eggs ---------- */
function initEggs(onNaija) {
  console.log(
    "%c PAULJI PETERS %c turning noise into signal ",
    "background:#ff5b1f;color:#0c0c0e;font-weight:700;padding:6px 8px;border-radius:4px 0 0 4px",
    "background:#0c0c0e;color:#f2ede4;padding:6px 8px;border-radius:0 4px 4px 0"
  );
  console.log("Reading the source? Good, that's how I work too.\nIt's all hand-written, no frameworks: github.com/soma-connects/Portfolio-\nHiring? pauljizy@gmail.com\n\npsst: ↑ ↑ ↓ ↓ ← → ← → B A");

  const code = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let pos = 0, naija = false;
  window.addEventListener("keydown", (e) => {
    pos = e.key.toLowerCase() === code[pos] ? pos + 1 : e.key.toLowerCase() === code[0] ? 1 : 0;
    if (pos < code.length) return;
    pos = 0;
    naija = !naija;
    document.documentElement.style.setProperty("--signal", naija ? "#00b45a" : "");
    toast(naija ? "Naija mode: green · white · green ✳" : "Back to signal orange ✳");
    onNaija?.();
  });
}

export function initMotion({ hero, reduced, onTheme }) {
  initReveals();
  initCounters();
  initCursor();
  initMagnetic();
  initArchive();
  initMenu();
  initCopy();
  initClock();
  initNavSpy();
  initScroll({ hero, reduced });
  initEggs(onTheme);
}
