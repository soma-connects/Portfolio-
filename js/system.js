/* ==========================================================================
   system.js:
   1. Deep "Architecture X-Ray" Case-Study Drawer (#2)
   2. Command Palette + Interactive Terminal (`⌘K` / `/`) + Signal Q&A (#3)
   3. Live Telemetry X-Ray HUD Overlay (`Shift+X`) (#3)
   ========================================================================== */

import { profile, stats, featured, archive, archiveFilters, layers, recruiterLenses } from "./data.js";
import { playTick, playSweep, playPing, isSoundEnabled, setSoundEnabled } from "./sound.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pad = (n) => String(n).padStart(2, "0");

/* Lightweight syntax highlighter for SQL, Python, TypeScript & Rust excerpts */
function highlightCode(raw) {
  const safe = esc(raw);
  return safe
    .replace(/(\/\/.*$|#.*$|--.*$)/gm, '<span class="tok-c">$1</span>')
    .replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`[\s\S]*?`)/g, '<span class="tok-s">$1</span>')
    .replace(
      /\b(export|async|function|const|let|return|if|for|of|in|await|throw|new|def|with|as|SELECT|FROM|LEFT|JOIN|GROUP|BY|CASE|WHEN|THEN|ELSE|END|AS|CREATE|VIEW|AND|OR|COALESCE|GREATEST|COUNT|SUM|Promise|continue)\b/g,
      '<span class="tok-k">$1</span>'
    )
    .replace(/\b(\d+(?:\.\d+)?n?)\b/g, '<span class="tok-n">$1</span>');
}

/* ==========================================================================
   1. ARCHITECTURE X-RAY DRAWER (#2)
   ========================================================================== */
function initXrayDrawer({ onToast }) {
  const drawer = $("#xray-drawer");
  if (!drawer) return { open: () => {}, close: () => {} };

  const body = $(".xray__body", drawer);
  const navBar = $(".xray__tabs", drawer);
  const titleEl = $(".xray__top-title", drawer);
  let activeId = null;

  // Render quick-switch tabs (01..06) in the drawer header
  navBar.innerHTML = featured
    .map(
      (p, i) =>
        `<button class="xray__tab mono" type="button" data-xray-tab="${esc(p.id)}"><span>${pad(i + 1)}</span>${esc(
          p.name
        )}</button>`
    )
    .join("");

  function renderProject(id) {
    const idx = featured.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const p = featured[idx];
    const x = p.xray;
    if (!x) return;

    activeId = p.id;
    const prev = featured[(idx - 1 + featured.length) % featured.length];
    const next = featured[(idx + 1) % featured.length];

    titleEl.textContent = `BLUEPRINT // FIG. ${pad(idx + 1)} · ${p.name.toUpperCase()}`;
    $$(".xray__tab", navBar).forEach((b) =>
      b.setAttribute("aria-selected", String(b.dataset.xrayTab === p.id))
    );

    body.innerHTML = `
      <div class="xray__hero">
        <div class="xray__meta mono">
          <span class="xray__badge">SYSTEM ${pad(idx + 1)} / ${pad(featured.length)}</span>
          <span>${esc(p.role)}</span>
          <span>${esc(p.year)}</span>
        </div>
        <h3 class="xray__name">${esc(p.name)}</h3>
        <p class="xray__pitch">${esc(p.pitch)}</p>
      </div>

      <div class="xray__metrics">
        ${x.metrics
          .map(
            (m) => `
          <div class="xray__metric">
            <span class="xray__metric-val">${esc(m.value)}</span>
            <span class="xray__metric-lab mono">${esc(m.label)}</span>
          </div>`
          )
          .join("")}
      </div>

      <div class="xray__cards">
        <section class="xray__card">
          <h4 class="xray__label mono"><span>(A)</span><span>The Bottleneck / Threat Model</span></h4>
          <p>${esc(x.problem)}</p>
        </section>
        <section class="xray__card xray__card--signal">
          <h4 class="xray__label mono"><span>(B)</span><span>Hardest Production Edge Case</span></h4>
          <p>${esc(x.hardestBug)}</p>
        </section>
      </div>

      <section class="xray__section">
        <h4 class="xray__label mono"><span>(C)</span><span>Pipeline Topology &amp; Invariants</span></h4>
        <ol class="xray__pipe">
          ${x.pipeline
            .map(
              (s) => `
            <li class="xray__step">
              <div class="xray__step-head">
                <strong class="mono">${esc(s.step)}</strong>
                <span class="xray__tag mono">${esc(s.tag)}</span>
              </div>
              <p>${esc(s.detail)}</p>
            </li>`
            )
            .join("")}
        </ol>
      </section>

      <section class="xray__section">
        <div class="xray__code-head mono">
          <span>(D) Core Implementation · ${esc(x.codeFile)}</span>
          <div class="xray__code-actions">
            <span class="xray__lang">${esc(x.codeLang)}</span>
            <button class="xray__copy mono" type="button" data-copy-code>[ Copy snippet ]</button>
          </div>
        </div>
        <pre class="xray__pre"><code>${highlightCode(x.code)}</code></pre>
      </section>

      ${
        x.postmortem
          ? `
      <section class="xray__section xray__postmortem">
        <div class="xray__pm-head">
          <h4 class="xray__label mono"><span>(E)</span><span>Deep Engineering Post-Mortem</span></h4>
          <span class="xray__tag mono">${esc(x.postmortem.readTime || "4 min read")}</span>
        </div>
        <h5 class="xray__pm-title">${esc(x.postmortem.title)}</h5>
        <div class="xray__pm-list">
          ${x.postmortem.sections
            .map(
              (sec) => `
            <article class="xray__pm-item">
              <h6 class="mono">${esc(sec.heading)}</h6>
              <p>${esc(sec.body)}</p>
            </article>`
            )
            .join("")}
        </div>
      </section>`
          : ""
      }

      <footer class="xray__foot">
        <button class="xray__switch mono" type="button" data-xray-tab="${esc(prev.id)}">← ${pad(
          ((idx - 1 + featured.length) % featured.length) + 1
        )} · ${esc(prev.name)}</button>
        <div class="xray__foot-links">
          ${
            p.live
              ? `<a class="btn btn--solid" href="${esc(p.live)}" target="_blank" rel="noopener">Live deployment ↗</a>`
              : ""
          }
          ${
            p.repo
              ? `<a class="btn" href="${esc(p.repo)}" target="_blank" rel="noopener">Source repo ↗</a>`
              : ""
          }
        </div>
        <button class="xray__switch mono" type="button" data-xray-tab="${esc(next.id)}">${pad(
          ((idx + 1) % featured.length) + 1
        )} · ${esc(next.name)} →</button>
      </footer>
    `;

    body.scrollTop = 0;

    // Bind copy snippet button
    $("[data-copy-code]", body)?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(x.code);
        playPing(true);
        onToast?.(`Copied ${x.codeFile} to clipboard ✳`);
      } catch {
        onToast?.("Snippet ready");
      }
    });
  }

  function open(id) {
    renderProject(id || featured[0].id);
    const wasOpen = drawer.classList.contains("is-open");
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-overlay");
    if (!wasOpen) playSweep(true);
    else playTick(960);
  }

  function close() {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-overlay");
    playSweep(false);
  }

  // Delegate clicks on [data-xray], [data-xray-tab], or [data-xray-close]
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-xray]");
    if (trigger) {
      e.preventDefault();
      open(trigger.dataset.xray);
      return;
    }
    const tab = e.target.closest("[data-xray-tab]");
    if (tab) {
      renderProject(tab.dataset.xrayTab);
      playTick(1080);
      return;
    }
    if (e.target.closest("[data-xray-close]") || e.target.classList.contains("xray__backdrop")) {
      close();
    }
  });

  // Keyboard navigation inside the drawer (Left/Right or 1..6)
  window.addEventListener("keydown", (e) => {
    if (!drawer.classList.contains("is-open")) return;
    if (e.key === "Escape") {
      close();
      return;
    }
    const idx = featured.findIndex((p) => p.id === activeId);
    if (e.key === "ArrowRight" && idx !== -1) {
      open(featured[(idx + 1) % featured.length].id);
    } else if (e.key === "ArrowLeft" && idx !== -1) {
      open(featured[(idx - 1 + featured.length) % featured.length].id);
    } else if (/^[1-6]$/.test(e.key)) {
      const target = featured[Number(e.key) - 1];
      if (target) open(target.id);
    }
  });

  return { open, close };
}

/* ==========================================================================
   2. SITE-WIDE TELEMETRY X-RAY OVERLAY (#3)
   ========================================================================== */
function initTelemetry({ onToast }) {
  const hud = $("#telemetry-hud");
  if (!hud) return { toggle: () => {}, isActive: () => false };

  const fpsEl = $("[data-tel-fps]", hud);
  const msEl = $("[data-tel-ms]", hud);
  const scrollEl = $("[data-tel-scroll]", hud);
  const domEl = $("[data-tel-dom]", hud);
  const vpEl = $("[data-tel-vp]", hud);
  const spark = $("canvas", hud);
  const sCtx = spark?.getContext("2d");

  let active = false;
  let raf = 0;
  let last = performance.now();
  let frames = 0;
  let fps = 60;
  let avgMs = 16.6;
  const history = new Array(44).fill(16.6);

  function loop(now) {
    if (!active) return;
    const dt = now - last;
    last = now;
    frames++;
    avgMs = avgMs * 0.88 + dt * 0.12;
    fps = Math.min(144, Math.round(1000 / Math.max(1, avgMs)));

    if (frames % 4 === 0) {
      history.push(Math.min(40, dt));
      if (history.length > 44) history.shift();

      if (fpsEl) fpsEl.textContent = `${fps} FPS`;
      if (msEl) msEl.textContent = `${avgMs.toFixed(1)} ms`;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const pct = Math.round((scrollY / maxScroll) * 100);
      if (scrollEl) scrollEl.textContent = `${Math.round(scrollY)}px (${pct}%)`;
      if (domEl) domEl.textContent = `${document.getElementsByTagName("*").length} nodes`;
      if (vpEl) vpEl.textContent = `${innerWidth}×${innerHeight} @${Math.min(devicePixelRatio || 1, 2)}x`;

      if (sCtx && spark) {
        const w = spark.width, h = spark.height;
        sCtx.clearRect(0, 0, w, h);
        sCtx.strokeStyle = "#3ddc97";
        sCtx.lineWidth = 1.5;
        sCtx.beginPath();
        history.forEach((v, i) => {
          const x = (i / (history.length - 1)) * w;
          const y = h - Math.min(1, v / 36) * (h - 4) - 2;
          i ? sCtx.lineTo(x, y) : sCtx.moveTo(x, y);
        });
        sCtx.stroke();
      }
    }
    raf = requestAnimationFrame(loop);
  }

  function setActive(next, notify = true) {
    active = Boolean(next);
    document.body.classList.toggle("is-xray", active);
    hud.setAttribute("aria-hidden", String(!active));
    $$("[data-xray-mode-toggle]").forEach((btn) => btn.setAttribute("aria-pressed", String(active)));
    if (active) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
      playPing(true);
      if (notify) onToast?.("Telemetry X-Ray overlay active · Shift+X to exit ✳");
    } else {
      cancelAnimationFrame(raf);
      playPing(false);
      if (notify) onToast?.("Telemetry X-Ray overlay off");
    }
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-xray-mode-toggle]")) {
      setActive(!active, true);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key.toLowerCase() === "x" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      setActive(!active, true);
    }
  });

  return {
    toggle: () => setActive(!active, true),
    set: (v) => setActive(v, true),
    isActive: () => active,
  };
}

/* ==========================================================================
   3. COMMAND PALETTE + INTERACTIVE SIGNAL TERMINAL (`⌘K` / `/`) (#3)
   ========================================================================== */

/* Synthesizes grounded answers from data.js when the visitor asks a question */
function answerQuery(raw) {
  const q = raw.toLowerCase().replace(/^(\?|ask\s+|>\s*)/, "").trim();
  if (!q) return null;

  if (/fintech|money|kobo|paystack|escrow|credit|loan|payment|bank/.test(q)) {
    return {
      title: "Fintech Rails, Kobo Accounting & Escrow Architecture",
      body:
        "Paulji builds financial systems where floats never touch money: every balance is stored in integer kobo with ACID locks. In My Data Keep, emergency credit is bounded by a PostgreSQL view (`reserve = tier% × lifetime_profit − active_debt`) with transaction-scoped advisory locks. In Lezerv, Paystack escrow holds homeowner funds and splits 90%/10% on verified completion via idempotent HMAC-SHA512 webhooks.",
      actions: [
        { label: "Inspect My Data Keep X-Ray", xray: "datakeep" },
        { label: "Inspect Lezerv Escrow X-Ray", xray: "lezerv" },
      ],
    };
  }

  if (/solana|web3|rust|anchor|blockchain|crypto|reclaim|kora|security/.test(q)) {
    return {
      title: "Solana On-Chain Automation & Rust Security",
      body:
        "Ships production TypeScript + Rust on Solana. Built N-Reclaim for the Superteam Nigeria bounty to recover 0.00203928 SOL per abandoned Kora-sponsored token account (packing 18 atomic close instructions per transaction only when `balance === 0 && closeAuthority === bot`). Also authored Solana Security Lab: 5 Anchor programs shipped both vulnerable and patched.",
      actions: [
        { label: "Inspect N-Reclaim X-Ray", xray: "n-reclaim" },
        { label: "Filter Archive: Web3 & Security", filter: "web3" },
      ],
    };
  }

  if (/ai|gemini|vertex|vision|mediapipe|video|ffmpeg|clip|voice|ml|python/.test(q)) {
    return {
      title: "AI Pipelines, Computer Vision & Real-Time Audio",
      body:
        "Focuses on cost-aware, low-latency AI pipelines: Ncliper prunes 94% of 4-hour streams using chat/audio/OCR heuristics before calling Gemini Flash 2.0 and streaming byte-ranges into FFmpeg on Modal GPUs. EFitMi runs MediaPipe Pose + ISO-7810 bank-card calibration entirely on-device (`0.000 cm` Py↔TS parity). Voice Party Arcade combines 60fps autocorrelation pitch tracking with multilingual speech recognition.",
      actions: [
        { label: "Inspect Ncliper X-Ray", xray: "ncliper" },
        { label: "Inspect EFitMi Vision X-Ray", xray: "efitmi" },
        { label: "Inspect Voice Party X-Ray", xray: "voice-party" },
      ],
    };
  }

  if (/laravel|php|backend|sql|postgres|database|api|django|fastapi/.test(q)) {
    return {
      title: "Backend Architecture: Laravel, FastAPI, PostgreSQL & Security",
      body:
        "4+ years shipping relational schemas and hardened APIs across Laravel 12 (Eloquent, Sanctum, Jetstream), FastAPI, Node/Express (Argon2id + refresh-token family rotation in Techshop), and PostgreSQL/Supabase. Dedicated Laravel & Backend CV available alongside the Full-Stack & AI CV.",
      actions: [
        { label: "Open Laravel & Backend CV (PDF)", href: profile.cvLaravel },
        { label: "Filter Archive: Laravel", filter: "laravel" },
      ],
    };
  }

  if (/hire|contact|available|location|remote|email|rate|work|role|experience|years/.test(q)) {
    return {
      title: `Availability · ${profile.location}`,
      body: `${profile.name} has ${stats[3].value}+ years shipping production systems (${stats[0].value} repos, ${stats[1].value}K+ LOC, ${stats[2].value} live deployments) with a B.Eng. in Computer Engineering. Currently ${profile.available.toLowerCase()}. Reach out directly at ${profile.email}.`,
      actions: [
        { label: "Copy Email Address", copy: profile.email },
        { label: "Download Full-Stack & AI CV", href: profile.cv },
      ],
    };
  }

  // Fallback general synthesis across projects/stack
  return {
    title: "Signal Engineering Summary",
    body: `Paulji Peters is a full-stack engineer specializing in AI pipelines (Ncliper, EFitMi), Fintech rails (My Data Keep, Lezerv), and Solana automation (N-Reclaim, Solana Security Lab). Ask about "fintech & kobo math", "AI & computer vision", "Solana & Rust", "Laravel backend", or "availability".`,
    actions: [
      { label: "Inspect Ncliper Blueprint", xray: "ncliper" },
      { label: "Inspect My Data Keep Blueprint", xray: "datakeep" },
    ],
  };
}

function initCommandPalette({ xrayDrawer, telemetry, onTheme, onToast }) {
  const modal = $("#cmd-palette");
  if (!modal) return;

  const input = $(".cmd__input", modal);
  const listEl = $(".cmd__list", modal);
  const answerEl = $(".cmd__answer", modal);
  let selectedIdx = 0;
  let visibleCommands = [];

  const jumpTo = (selector, filterKey = null) => {
    close();
    if (filterKey) {
      const btn = $(`[data-filter="${filterKey}"]`);
      btn?.click();
    }
    const target = $(selector);
    target?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleTheme = (mode) => {
    if (mode === "naija") {
      const cur = document.documentElement.style.getPropertyValue("--signal");
      const next = cur ? "" : "#00b45a";
      document.documentElement.style.setProperty("--signal", next);
      onTheme?.();
      playPing(true);
      onToast?.(next ? "Naija mode: green · white · green ✳" : "Restored signal orange ✳");
    } else {
      document.body.dataset.theme = mode;
      onTheme?.();
      playPing(true);
      onToast?.(`Theme switched to ${mode} mode`);
    }
    close();
  };

  function getCommands() {
    const soundOn = isSoundEnabled();
    const xrayOn = telemetry.isActive();

    const base = [
      // Architecture X-Ray blueprints
      ...featured.map((p, i) => ({
        group: "Architecture X-Ray Blueprints",
        title: `Inspect ${p.name} Architecture`,
        sub: `Fig. ${pad(i + 1)} · ${p.xray?.codeLang || p.tags.join(" · ")}`,
        badge: "X-RAY",
        keywords: `xray blueprint architecture ${p.name} ${p.tags.join(" ")} ${p.stack.join(" ")}`.toLowerCase(),
        run: () => {
          close();
          xrayDrawer.open(p.id);
        },
      })),

      // Interactive Signal Q&A presets
      {
        group: "Signal Terminal Q&A (or type any question)",
        title: "Ask: How does Paulji prevent double-spend & float drift in Fintech?",
        sub: "Kobo integer accounting, SQL views & advisory locks",
        badge: "ASK AI",
        keywords: "ask fintech money kobo paystack escrow credit sql",
        query: "How does Paulji prevent double-spend and float drift in fintech?",
      },
      {
        group: "Signal Terminal Q&A (or type any question)",
        title: "Ask: How do the AI & Computer Vision pipelines stay fast and cheap?",
        sub: "Ncliper 94% heuristic pruning + EFitMi on-device MediaPipe",
        badge: "ASK AI",
        keywords: "ask ai gemini vision mediapipe ffmpeg python clip",
        query: "How do Paulji's AI and computer vision pipelines stay fast and cheap?",
      },
      {
        group: "Signal Terminal Q&A (or type any question)",
        title: "Ask: What is Paulji's experience with Solana, Rust & Security?",
        sub: "N-Reclaim atomic rent recovery & Solana Security Lab",
        badge: "ASK AI",
        keywords: "ask solana web3 rust security anchor blockchain",
        query: "What is Paulji's experience with Solana, Rust and security?",
      },
      {
        group: "Signal Terminal Q&A (or type any question)",
        title: "Ask: What Laravel & Backend systems has he shipped?",
        sub: "Laravel 12, FastAPI, PostgreSQL, Argon2id auth & threat models",
        badge: "ASK AI",
        keywords: "ask laravel php backend postgres api",
        query: "What Laravel and backend systems has Paulji shipped?",
      },

      // Live System Controls
      {
        group: "System Telemetry & Audio",
        title: xrayOn ? "Disable Site-Wide Telemetry X-Ray Overlay" : "Enable Site-Wide Telemetry X-Ray Overlay",
        sub: "Live FPS sparkline, frame budget, DOM nodes & blueprint bounds",
        badge: "Shift + X",
        keywords: "xray telemetry fps debug overlay performance",
        run: () => {
          close();
          telemetry.toggle();
        },
      },
      {
        group: "System Telemetry & Audio",
        title: soundOn ? "Mute WebAudio Signal Synth" : "Enable WebAudio Signal Sonification",
        sub: "Procedural harmonic lock chord, filter sweeps & micro-ticks",
        badge: soundOn ? "SOUND ON" : "SOUND OFF",
        keywords: "sound audio music synth webaudio mute unmute",
        run: () => {
          setSoundEnabled(!soundOn, { notify: true, onToast });
          renderList();
        },
      },
      {
        group: "System Telemetry & Audio",
        title: "Toggle Naija Signal Accent (#00b45a)",
        sub: "Switch accent token between Signal Orange and Nigeria Green",
        badge: "THEME",
        keywords: "theme naija green color easter egg konami",
        run: () => toggleTheme("naija"),
      },
      {
        group: "System Telemetry & Audio",
        title: "Switch Surface to Cream Light Mode",
        sub: "Interpolate CSS @property color tokens to paper cream",
        badge: "THEME",
        keywords: "theme light cream paper mode",
        run: () => toggleTheme("light"),
      },
      {
        group: "System Telemetry & Audio",
        title: "Switch Surface to Signal Dark Mode",
        sub: "Interpolate CSS @property color tokens to obsidian dark",
        badge: "THEME",
        keywords: "theme dark obsidian mode",
        run: () => toggleTheme("dark"),
      },

      // Quick Actions, CV & Navigation
      {
        group: "Credentials & Navigation",
        title: "Open the Lab: try to break the Safe Margin Rule",
        sub: "Live simulator: integer kobo, SQL-view maths & advisory-lock race",
        badge: "LAB",
        keywords: "lab simulator break safe margin race lock fintech datakeep demo play",
        run: () => jumpTo("#lab"),
      },
      {
        group: "Credentials & Navigation",
        title: `Copy Email (${profile.email})`,
        sub: "Copy directly to clipboard",
        badge: "COPY",
        keywords: "copy email contact hire pauljizy",
        run: async () => {
          close();
          try {
            await navigator.clipboard.writeText(profile.email);
            playPing(true);
            onToast?.("Email copied. Talk soon ✳");
          } catch {
            onToast?.(profile.email);
          }
        },
      },
      {
        group: "Credentials & Navigation",
        title: "Open Full-Stack & AI CV (PDF)",
        sub: "Next.js, Python, Gemini, FastAPI, Solana",
        badge: "PDF ↗",
        keywords: "cv resume pdf fullstack ai download",
        run: () => {
          close();
          window.open(profile.cv, "_blank", "noopener");
        },
      },
      {
        group: "Credentials & Navigation",
        title: "Open Laravel & Backend CV (PDF)",
        sub: "Laravel 12, PHP 8, PostgreSQL, MySQL, REST APIs",
        badge: "PDF ↗",
        keywords: "cv resume pdf laravel php backend download",
        run: () => {
          close();
          window.open(profile.cvLaravel, "_blank", "noopener");
        },
      },
      ...archiveFilters
        .filter((f) => f.key !== "all")
        .map((f) => ({
          group: "Filter Repository Archive",
          title: `Filter Archive: ${f.label} Repositories`,
          sub: `Jump to #archive and filter by ${f.label}`,
          badge: `TAG:${f.key.toUpperCase()}`,
          keywords: `filter archive tag ${f.key} ${f.label}`.toLowerCase(),
          run: () => jumpTo("#archive", f.key),
        })),
    ];

    return base;
  }

  /* Paints an answer card. `ans` = { title, body, actions } */
  function paintAnswer(ans, { head = "SIGNAL // KEYWORD MODE", tag = "GROUNDED ON DATA.JS", state = "", hint = "" } = {}) {
    answerEl.hidden = false;
    answerEl.classList.toggle("is-thinking", state === "thinking");
    answerEl.classList.toggle("is-ungrounded", state === "ungrounded");
    answerEl.innerHTML = `
      <div class="cmd__ans-head mono">
        <span>${esc(head)}</span>
        <span>${esc(tag)}</span>
      </div>
      <h4 class="cmd__ans-title">${esc(ans.title)}</h4>
      <p class="cmd__ans-body">${esc(ans.body)}</p>
      <div class="cmd__ans-actions">
        ${(ans.actions || [])
          .map((a, i) => `<button class="cmd__ans-btn mono" type="button" data-ans-idx="${i}">${esc(a.label)} ↗</button>`)
          .join("")}
      </div>
      ${hint ? `<p class="cmd__ans-hint mono">${esc(hint)}</p>` : ""}
    `;

    $$("[data-ans-idx]", answerEl).forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = ans.actions[Number(btn.dataset.ansIdx)];
        if (!act) return;
        if (act.xray) {
          close();
          xrayDrawer.open(act.xray);
        } else if (act.filter) {
          jumpTo("#archive", act.filter);
        } else if (act.jump) {
          jumpTo(act.jump);
        } else if (act.href) {
          close();
          window.open(act.href, "_blank", "noopener");
        } else if (act.copy) {
          navigator.clipboard?.writeText(act.copy);
          playPing(true);
          onToast?.("Email copied. Talk soon ✳");
          close();
        }
      });
    });
  }

  /* Instant, offline keyword answer (shown while typing, and as the fallback) */
  function renderAnswer(qText) {
    const ans = answerQuery(qText);
    if (!ans) {
      answerEl.hidden = true;
      answerEl.innerHTML = "";
      return;
    }
    paintAnswer(ans, { hint: "↵ Enter: ask Signal AI (Gemini, grounded on this site's data)" });
  }

  /* Turns the model's cited source ids into buttons */
  function actionsFor(sources) {
    const acts = [];
    for (const id of sources) {
      const p = featured.find((f) => f.id === id);
      if (p) acts.push({ label: `Inspect ${p.name} X-Ray`, xray: p.id });
      else if (id === "profile") acts.push({ label: "Copy Email Address", copy: profile.email });
      else if (id === "archive") acts.push({ label: "Open the Archive", jump: "#archive" });
      else if (id === "stack") acts.push({ label: "See the Stack", jump: "#stack" });
      else if (id === "journey") acts.push({ label: "See the Journey", jump: "#journey" });
    }
    if (sources.includes("datakeep")) acts.push({ label: "Break the Safe Margin live", jump: "#lab" });
    return acts.slice(0, 4);
  }

  /* Real AI: POST /api/ask (api/ask.js on Vercel). Falls back to keyword mode
     when the endpoint isn't there (local static server) or is unavailable. */
  const aiCache = new Map();
  let askSeq = 0;
  async function askRemote(raw) {
    const q = raw.replace(/^(\?|ask\s+|>\s*)/i, "").trim();
    if (!q) return;
    const seq = ++askSeq;
    const key = q.toLowerCase();

    const show = (r) => {
      if (seq !== askSeq) return; // a newer question superseded this one
      paintAnswer(
        { title: r.title, body: r.answer, actions: r.grounded ? actionsFor(r.sources || []) : [{ label: "Copy Email Address", copy: profile.email }] },
        r.grounded
          ? { head: "SIGNAL AI // GEMINI", tag: `CITES: ${(r.sources || []).join(" · ").toUpperCase() || "DATA.JS"}` }
          : { head: "SIGNAL AI // NOT IN MY DATA", tag: "REFUSED TO GUESS", state: "ungrounded" }
      );
      playPing(true);
    };

    if (aiCache.has(key)) return show(aiCache.get(key));

    paintAnswer({ title: q, body: "Reading data.js and composing a grounded answer", actions: [] }, {
      head: "SIGNAL AI // THINKING",
      tag: "GEMINI",
      state: "thinking",
    });
    playTick(1040);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
        signal: AbortSignal.timeout?.(20000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (!data?.answer) throw new Error("empty");
      aiCache.set(key, data);
      show(data);
    } catch (err) {
      if (seq !== askSeq) return;
      const offline = answerQuery(q);
      const why = err?.message === "429" ? "RATE LIMITED, TRY AGAIN IN A MINUTE" : "AI OFFLINE, KEYWORD ANSWER";
      if (offline) paintAnswer(offline, { head: "SIGNAL // KEYWORD MODE", tag: why });
    }
  }

  const isQuestion = (q) => /^(\?|ask |how |what |why |does |do |is |can |who |where |when |which |tell |has |have |did |explain )/i.test(q);

  function renderList() {
    const raw = input.value.trim();
    const q = raw.toLowerCase();
    const all = getCommands();

    const isExplicitAsk = isQuestion(q);

    visibleCommands = q
      ? all.filter((c) => c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q) || c.keywords.includes(q))
      : all;

    if (isExplicitAsk || (q.length > 2 && visibleCommands.length === 0)) {
      renderAnswer(raw);
    } else {
      answerEl.hidden = true;
      answerEl.innerHTML = "";
    }

    selectedIdx = Math.min(selectedIdx, Math.max(0, visibleCommands.length - 1));

    let currentGroup = "";
    listEl.innerHTML = visibleCommands
      .map((cmd, idx) => {
        const groupHeader =
          cmd.group !== currentGroup
            ? `<li class="cmd__group mono" role="presentation">${esc((currentGroup = cmd.group))}</li>`
            : "";
        return `${groupHeader}
          <li class="cmd__item ${idx === selectedIdx ? "is-active" : ""}" role="option" aria-selected="${
            idx === selectedIdx
          }" data-cmd-idx="${idx}">
            <div class="cmd__item-main">
              <span class="cmd__item-title">${esc(cmd.title)}</span>
              <span class="cmd__item-sub">${esc(cmd.sub)}</span>
            </div>
            <span class="cmd__badge mono">${esc(cmd.badge)}</span>
          </li>`;
      })
      .join("");

    const activeItem = $(`.cmd__item[data-cmd-idx="${selectedIdx}"]`, listEl);
    activeItem?.scrollIntoView({ block: "nearest" });
  }

  function runSelected(idx = selectedIdx) {
    const cmd = visibleCommands[idx];
    if (!cmd) return;
    if (cmd.query) {
      input.value = cmd.query;
      askRemote(cmd.query);
      input.focus();
      return;
    }
    cmd.run?.();
  }

  function open(initialQuery = "") {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-overlay");
    input.value = initialQuery;
    selectedIdx = 0;
    renderList();
    playSweep(true);
    requestAnimationFrame(() => input.focus());
  }

  function close() {
    if (!modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-overlay");
    playSweep(false);
  }

  input.addEventListener("input", () => {
    askSeq++; // typing cancels any in-flight AI answer
    selectedIdx = 0;
    renderList();
    playTick(920);
  });

  listEl.addEventListener("click", (e) => {
    const item = e.target.closest("[data-cmd-idx]");
    if (!item) return;
    runSelected(Number(item.dataset.cmdIdx));
  });

  listEl.addEventListener("pointermove", (e) => {
    const item = e.target.closest("[data-cmd-idx]");
    if (!item) return;
    const idx = Number(item.dataset.cmdIdx);
    if (idx !== selectedIdx) {
      selectedIdx = idx;
      $$(".cmd__item", listEl).forEach((el, i) => {
        el.classList.toggle("is-active", i === selectedIdx);
        el.setAttribute("aria-selected", String(i === selectedIdx));
      });
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-cmd-open]")) {
      e.preventDefault();
      open();
    } else if (e.target.closest("[data-cmd-close]") || e.target.classList.contains("cmd__backdrop")) {
      close();
    }
  });

  window.addEventListener("keydown", (e) => {
    const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
    const isSlash =
      e.key === "/" &&
      !modal.classList.contains("is-open") &&
      !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);

    if (isCmdK || isSlash) {
      e.preventDefault();
      modal.classList.contains("is-open") ? close() : open();
      return;
    }

    if (!modal.classList.contains("is-open")) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (visibleCommands.length) {
        selectedIdx = (selectedIdx + 1) % visibleCommands.length;
        renderList();
        playTick(780);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (visibleCommands.length) {
        selectedIdx = (selectedIdx - 1 + visibleCommands.length) % visibleCommands.length;
        renderList();
        playTick(880);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const raw = input.value.trim();
      // Questions go to the AI; anything else runs the highlighted command.
      if (raw && (isQuestion(raw) || !visibleCommands.length)) askRemote(raw);
      else if (visibleCommands[selectedIdx]) runSelected(selectedIdx);
    }
  });

  return { open, close };
}

/* ==========================================================================
   4. RECRUITER ROLE LENS (`?for=ai|fintech|web3|laravel`) (#5)
   ========================================================================== */
function initRecruiterLens({ onToast }) {
  if (!recruiterLenses?.length) return { apply: () => {} };
  let activeKey = "all";

  function apply(key, { notify = true, updateUrl = true } = {}) {
    const lens = recruiterLenses.find((l) => l.key === key) || recruiterLenses[0];
    activeKey = lens.key;

    // 1. Update lens bar chips & subtitle
    $$("[data-lens]").forEach((btn) => {
      const on = btn.dataset.lens === lens.key;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    const subEl = $("[data-lens-sub]");
    if (subEl) subEl.textContent = lens.sub;

    // 2. Re-order featured project articles in .work__list without destroying canvases
    const list = $(".work__list");
    if (list && lens.order) {
      lens.order.forEach((id, i) => {
        const card = document.getElementById(id);
        if (card) {
          list.appendChild(card);
          const idxEl = $(".project__idx", card);
          if (idxEl) idxEl.textContent = `${pad(i + 1)} / ${pad(featured.length)}`;
        }
      });
    }

    // 3. Pre-filter the repository archive
    if (lens.archiveFilter) {
      const filterBtn = $(`[data-filter="${lens.archiveFilter}"]`);
      filterBtn?.click();
    }

    // 4. Point primary CV links to the matching CV (Full-Stack/AI vs. Laravel/Backend)
    const cvHref = profile[lens.cv] || profile.cv;
    $$('a[href*="Paulji-Peters-"][href$="-CV.pdf"]').forEach((a) => {
      if (a.textContent.includes("CV ↓") || a.textContent.includes("Download CV") || a.textContent.includes("Resume")) {
        a.setAttribute("href", cvHref);
      }
    });

    // 5. Update URL query parameter cleanly
    if (updateUrl && history.replaceState) {
      const url = new URL(location.href);
      if (lens.key === "all") url.searchParams.delete("for");
      else url.searchParams.set("for", lens.key);
      history.replaceState(null, "", url.toString());
    }

    if (notify) {
      playPing(true);
      onToast?.(
        lens.key === "all"
          ? "Showing default full-stack engineering order"
          : `Recruiter lens active: ${lens.label} (?for=${lens.key}) ✳`
      );
    }
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-lens]");
    if (btn) {
      apply(btn.dataset.lens, { notify: true, updateUrl: true });
      return;
    }
    if (e.target.closest("[data-lens-share]")) {
      const url = new URL(location.href);
      if (activeKey === "all") url.searchParams.delete("for");
      else url.searchParams.set("for", activeKey);
      try {
        await navigator.clipboard.writeText(url.toString());
        playPing(true);
        onToast?.(`Copied tailored link (?for=${activeKey}) ✳`);
      } catch {
        onToast?.(url.toString());
      }
    }
  });

  // Auto-apply if URL has ?for=... on load
  const initial = new URLSearchParams(location.search).get("for")?.toLowerCase();
  if (initial && recruiterLenses.some((l) => l.key === initial)) {
    setTimeout(() => apply(initial, { notify: true, updateUrl: false }), 350);
  }

  return { apply };
}

export function initSystem({ onTheme, onToast } = {}) {
  const xrayDrawer = initXrayDrawer({ onToast });
  const telemetry = initTelemetry({ onToast });
  const recruiterLens = initRecruiterLens({ onToast });
  const commandPalette = initCommandPalette({ xrayDrawer, telemetry, onTheme, onToast });
  return { xrayDrawer, telemetry, recruiterLens, commandPalette };
}
