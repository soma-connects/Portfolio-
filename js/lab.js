/* ==========================================================================
   lab.js: "Don't trust me. Break it." — Multi-System Interactive Lab
   --------------------------------------------------------------------------
   Three live, deterministic sandboxes modeling the real production engines:

   1. FINTECH · My Data Keep's Safe Margin Rule
      - Integer-kobo accounting (₦1 = 100 kobo). Floats never touch money.
      - Derived reserve: max(0, floor(lifetime_profit × tier% / 100) − debt).
      - Concurrent async borrow transactions serialized via an in-browser
        pg_advisory_xact_lock(user_id) mutex—or unlocked to trigger a race.

   2. VISION · EFitMi ISO-7810 Calibration & Cosine Yaw Guard
      - Anchors pixel-to-cm scale on an ISO/IEC 7810 ID-1 bank card (85.60 mm).
      - Simulates 3D torso rotation (yaw θ): projecting a turned torso onto a
        2D camera sensor foreshortens horizontal width by cos(θ).
      - Enforces the ±12.0° acromion z-depth posture gate and Ramanujan
        elliptical circumference calculation.

   3. WEB3 · N-Reclaim Solana SPL Rent-Recovery & 18-IX Batch Packer
      - Scans Kora-sponsored Associated Token Accounts (0.00203928 SOL each).
      - Enforces the strict two-phase pre-flight invariant:
          rawAmount === 0n  &&  state !== "Frozen"  &&  closeAuthority === "KoraBot"
      - Packs surviving accounts into atomic 18-instruction transactions
        under Solana's 1232-byte packet ceiling.
   ========================================================================== */
import { playTick, playPing } from "./sound.js";

const USER_ID = 42;
const RACE_SIZE = 5;
const TOPUP_KOBO = 100_000; // ₦1,000
const ISO_CARD_CM = 8.56; // ISO/IEC 7810 ID-1 bank card width (85.60 mm)
const RENT_LAMPORTS = 2_039_280; // 0.00203928 SOL rent-exempt minimum per SPL ATA
const MAX_IX_PER_TX = 18;

/* Same thresholds as the CASE expression in the SQL view (highest tier first) */
const TIERS = [
  { name: "Gold", pct: 30, min: 20, trust: 80 },
  { name: "Silver", pct: 25, min: 8, trust: 55 },
  { name: "Bronze", pct: 20, min: 3, trust: 30 },
];
const NO_TIER = { name: "Locked", pct: 0, min: 3, trust: 30 };

export const tierFor = (purchases, trust) => TIERS.find((t) => purchases >= t.min && trust >= t.trust) || NO_TIER;

/* Pure function of state: the JS twin of the SQL view */
export function reserveOf(s) {
  const lifetime = s.purchases * s.profitKobo;
  const tier = tierFor(s.purchases, s.trust);
  const cap = Math.floor((lifetime * tier.pct) / 100); // integer division, like Postgres
  return {
    lifetime,
    tier,
    cap,
    available: Math.max(0, cap - s.debtKobo),
    overMargin: Math.max(0, s.debtKobo - cap), // credit beyond the Safe Margin
    atRisk: Math.max(0, s.debtKobo - lifetime), // the platform's own capital
  };
}

/* Integer-only currency formatting: kobo → "₦1,234.05" */
export function naira(kobo) {
  const neg = kobo < 0;
  const k = Math.abs(kobo);
  const whole = Math.trunc(k / 100);
  const frac = String(k % 100).padStart(2, "0");
  return `${neg ? "−" : ""}₦${whole.toLocaleString("en-NG")}.${frac}`;
}

/* Pure function of EFitMi calibration & cosine yaw guard */
export function computeVisionMetrics({ cardPx, trueShoulderCm, yawDeg, guardOn }) {
  const cmPerPx = ISO_CARD_CM / cardPx;
  const rad = (Math.abs(yawDeg) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const apparentShoulderCm = trueShoulderCm * cos;
  const errorPct = (1 - cos) * 100;
  // Ramanujan ellipse circumference approximation from coronal width + sagittal depth (0.68 ratio)
  const a = (apparentShoulderCm * 0.44) / 2;
  const b = (trueShoulderCm * 0.30) / 2;
  const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
  const chestCircCm = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  const rejected = guardOn && Math.abs(yawDeg) > 12.0;
  return {
    cmPerPx,
    apparentShoulderCm,
    chestCircCm,
    errorPct,
    rejected,
  };
}

/* A per-key async mutex: the in-browser stand-in for pg_advisory_xact_lock */
function createAdvisoryLocks() {
  const tails = new Map();
  return async function withLock(key, fn, onWait) {
    const prev = tails.get(key);
    let release;
    const mine = new Promise((r) => (release = r));
    const tail = (prev || Promise.resolve()).then(() => mine);
    tails.set(key, tail);
    if (prev) {
      onWait?.();
      await prev;
    }
    try {
      return await fn();
    } finally {
      release(); // COMMIT releases a transaction-scoped advisory lock
      if (tails.get(key) === tail) tails.delete(key);
    }
  };
}

const DEFAULTS = { purchases: 12, profitKobo: 15_000, trust: 62, debtKobo: 0 };

const TEMPLATE = `
  <div class="sim__tabs mono" role="tablist" aria-label="Select interactive system lab">
    <button class="sim__tab is-active" type="button" role="tab" aria-selected="true" data-lab-tab="fintech">
      <span>01</span>My Data Keep · Safe Margin &amp; Lock Race
    </button>
    <button class="sim__tab" type="button" role="tab" aria-selected="false" data-lab-tab="vision">
      <span>02</span>EFitMi · ISO-7810 &amp; Yaw Cosine Guard
    </button>
    <button class="sim__tab" type="button" role="tab" aria-selected="false" data-lab-tab="solana">
      <span>03</span>N-Reclaim · SPL Rent Batch Sweeper
    </button>
  </div>

  <!-- ==================== PANEL 1: FINTECH ==================== -->
  <div class="sim__pane is-active" data-lab-pane="fintech" role="tabpanel">
    <div class="sim__controls">
      <div class="sim__group">
        <p class="sim__kicker mono">01 · Customer ledger <span>append-only</span></p>
        <label class="sim__field">
          <span class="sim__row"><span>Successful data purchases</span><b data-out="purchases"></b></span>
          <input type="range" min="0" max="40" step="1" data-in="purchases" />
        </label>
        <label class="sim__field">
          <span class="sim__row"><span>Avg. margin per purchase</span><b data-out="profit"></b></span>
          <input type="range" min="10" max="400" step="10" data-in="profit" />
        </label>
        <label class="sim__field">
          <span class="sim__row"><span>Trust score</span><b data-out="trust"></b></span>
          <input type="range" min="0" max="100" step="1" data-in="trust" />
        </label>
        <ol class="sim__tiers mono" aria-label="Tier rules">
          ${TIERS.slice()
            .reverse()
            .map((t) => `<li data-tier="${t.name}"><b>${t.name} · ${t.pct}%</b><span>≥${t.min} buys · trust ≥${t.trust}</span></li>`)
            .join("")}
        </ol>
      </div>

      <div class="sim__group">
        <p class="sim__kicker mono">02 · Borrow <span>POST /credit/borrow</span></p>
        <label class="sim__field">
          <span class="sim__row"><span>Amount per request</span><b data-out="amount"></b></span>
          <input type="range" min="1" max="1" step="1" data-in="amount" />
        </label>
        <label class="sim__switch">
          <input type="checkbox" data-in="lock" checked />
          <span class="sim__switch-ui" aria-hidden="true"></span>
          <span class="sim__switch-text"><code>pg_advisory_xact_lock(user_id)</code><small data-out="lock"></small></span>
        </label>
        <div class="sim__actions">
          <button class="btn btn--solid" type="button" data-act="borrow" data-cursor="Borrow">Borrow once</button>
          <button class="btn btn--xray" type="button" data-act="race" data-cursor="Race"><span class="btn__pulse" aria-hidden="true"></span>Fire ${RACE_SIZE} at once</button>
          <button class="btn" type="button" data-act="topup" data-cursor="Repay">Top up ${naira(TOPUP_KOBO).replace(".00", "")}</button>
          <button class="btn" type="button" data-act="reset" data-cursor="Reset">Reset</button>
        </div>
      </div>
    </div>

    <div class="sim__readout">
      <div class="sim__head mono">
        <span>user_credit_reserve · user_id = ${USER_ID}</span>
        <span class="sim__tier" data-out="tier"></span>
      </div>

      <p class="sim__formula mono" data-out="formula" aria-live="polite"></p>

      <div class="sim__bar" aria-hidden="true">
        <i class="sim__bar-cap" data-bar="cap"></i>
        <i class="sim__bar-debt" data-bar="debt"></i>
        <i class="sim__bar-over" data-bar="over"></i>
      </div>
      <div class="sim__legend mono" aria-hidden="true">
        <span><i class="k-life"></i>Lifetime margin</span>
        <span><i class="k-cap"></i>Safe Margin</span>
        <span><i class="k-debt"></i>Active debt</span>
        <span><i class="k-over"></i>Over the limit</span>
      </div>

      <dl class="sim__metrics">
        <div><dt class="mono">Available reserve</dt><dd data-out="available"></dd></div>
        <div><dt class="mono">Over-margin exposure</dt><dd data-out="over"></dd></div>
        <div><dt class="mono">Platform capital at risk</dt><dd data-out="risk"></dd></div>
      </dl>

      <ol class="sim__lanes mono" data-out="lanes" aria-label="Concurrent transactions"></ol>
      <div class="sim__log mono" data-out="log" role="log" aria-live="polite" aria-label="Transaction log"></div>
    </div>
  </div>

  <!-- ==================== PANEL 2: VISION ==================== -->
  <div class="sim__pane" data-lab-pane="vision" role="tabpanel" hidden>
    <div class="sim__controls">
      <div class="sim__group">
        <p class="sim__kicker mono">01 · Optical Scale <span>ISO/IEC 7810 ID-1 (85.60 mm)</span></p>
        <label class="sim__field">
          <span class="sim__row"><span>Detected card bounding-box width</span><b data-vout="cardPx"></b></span>
          <input type="range" min="65" max="170" step="1" value="110" data-vin="cardPx" />
        </label>
        <label class="sim__field">
          <span class="sim__row"><span>Subject true biacromial shoulder span</span><b data-vout="trueShoulder"></b></span>
          <input type="range" min="36" max="54" step="0.5" value="45.0" data-vin="trueShoulder" />
        </label>
      </div>

      <div class="sim__group">
        <p class="sim__kicker mono">02 · 3D Torso Rotation <span>Acromion Z-Depth Asymmetry</span></p>
        <label class="sim__field">
          <span class="sim__row"><span>Torso yaw angle (θ) toward camera</span><b data-vout="yaw"></b></span>
          <input type="range" min="-35" max="35" step="1" value="6" data-vin="yaw" />
        </label>
        <label class="sim__switch">
          <input type="checkbox" data-vin="guard" checked />
          <span class="sim__switch-ui" aria-hidden="true"></span>
          <span class="sim__switch-text"><code>|atan2(dz, dx)| ≤ 12.0°</code><small data-vout="guardLabel"></small></span>
        </label>
        <div class="sim__actions">
          <button class="btn" type="button" data-vact="square">Square posture (4°)</button>
          <button class="btn btn--xray" type="button" data-vact="twist"><span class="btn__pulse" aria-hidden="true"></span>Simulate 25° selfie twist</button>
        </div>
      </div>
    </div>

    <div class="sim__readout">
      <div class="sim__head mono">
        <span>calibrateAndMeasure() · 0 bytes uploaded</span>
        <span class="sim__tier" data-vout="status"></span>
      </div>

      <p class="sim__formula mono" data-vout="formula"></p>

      <canvas class="sim__vcanvas" width="520" height="170" aria-label="Top-down torso rotation and camera projection diagram"></canvas>

      <dl class="sim__metrics">
        <div><dt class="mono">Scale (cm / px)</dt><dd data-vout="scale"></dd></div>
        <div><dt class="mono">2D sensor readout</dt><dd data-vout="apparent"></dd></div>
        <div><dt class="mono">Cosine foreshortening</dt><dd data-vout="error"></dd></div>
      </dl>
    </div>
  </div>

  <!-- ==================== PANEL 3: SOLANA ==================== -->
  <div class="sim__pane" data-lab-pane="solana" role="tabpanel" hidden>
    <div class="sim__controls">
      <div class="sim__group">
        <p class="sim__kicker mono">01 · Kora Paymaster Treasury <span>SPL Token Program</span></p>
        <p class="sim__note">Each sponsored Associated Token Account locks <b>0.00203928 SOL</b> (2,039,280 lamports). Click any account tile on the right to toggle its state between <em>Zero-balance Zombie</em>, <em>User Still Holds Tokens</em>, or <em>Authority Revoked</em>.</p>
        <label class="sim__switch">
          <input type="checkbox" data-sin="strict" checked />
          <span class="sim__switch-ui" aria-hidden="true"></span>
          <span class="sim__switch-text"><code>bal === 0n &amp;&amp; auth === KoraBot</code><small data-sout="strictLabel"></small></span>
        </label>
        <div class="sim__actions">
          <button class="btn btn--solid" type="button" data-sact="sweep">Simulate &amp; Sweep Rent</button>
          <button class="btn" type="button" data-sact="randomize">New RPC Scan (24 ATAs)</button>
        </div>
      </div>
    </div>

    <div class="sim__readout">
      <div class="sim__head mono">
        <span>buildSafeReclaimTx() · max 18 IX / 1232B packet</span>
        <span class="sim__tier" data-sout="summary"></span>
      </div>

      <div class="sim__ata-grid mono" data-sout="grid" aria-label="Scanned SPL token accounts"></div>

      <dl class="sim__metrics">
        <div><dt class="mono">Safe to close</dt><dd data-sout="safeCount"></dd></div>
        <div><dt class="mono">Atomic Tx batches</dt><dd data-sout="txCount"></dd></div>
        <div><dt class="mono">Reclaimable SOL</dt><dd data-sout="sol"></dd></div>
      </dl>

      <div class="sim__log mono" data-sout="log" role="log" aria-live="polite"></div>
    </div>
  </div>
`;

export function initLab({ reduced = false, onToast } = {}) {
  const root = document.querySelector("[data-lab='safe-margin']");
  if (!root) return null;
  root.innerHTML = TEMPLATE;

  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const inp = (k) => $(`[data-in="${k}"]`);
  const out = (k) => $(`[data-out="${k}"]`);
  const withLock = createAdvisoryLocks();

  /* ---------- Tab switching ---------- */
  $$("[data-lab-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.labTab;
      $$("[data-lab-tab]").forEach((t) => {
        const on = t.dataset.labTab === target;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      $$("[data-lab-pane]").forEach((p) => {
        const on = p.dataset.labPane === target;
        p.classList.toggle("is-active", on);
        p.hidden = !on;
      });
      root.classList.remove("is-unlocked");
      playTick(980);
      if (target === "vision") renderVision();
    });
  });

  const state = { ...DEFAULTS };
  let amountNaira = 0; // UI value; converted to kobo as an integer
  let busy = false;
  const t0 = performance.now();

  /* Simulated 3G latency. Reads are quick and the gap before the write is
     long, which is the window where a race happens in real life. */
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 30) : ms));
  const jitter = (a, b) => a + Math.random() * (b - a);

  /* ---------- log ---------- */
  function log(text, kind = "") {
    const line = document.createElement("p");
    if (kind) line.className = `is-${kind}`;
    const ms = String(Math.round(performance.now() - t0) % 100000).padStart(5, "0");
    line.textContent = `[${ms}ms] ${text}`;
    const el = out("log");
    el.append(line);
    while (el.children.length > 40) el.firstChild.remove();
    el.scrollTop = el.scrollHeight;
  }

  /* ---------- lanes (one per concurrent request) ---------- */
  function setupLanes(n) {
    out("lanes").innerHTML = Array.from(
      { length: n },
      (_, i) =>
        `<li data-lane="${i + 1}"><span>R${i + 1}</span><span class="sim__track"><i></i></span><span class="sim__status">queued</span></li>`
    ).join("");
  }
  const STAGE = { begin: 12, wait: 22, read: 45, check: 70, commit: 100, reject: 100 };
  function lane(id, stage, text) {
    const li = out("lanes").querySelector(`[data-lane="${id}"]`);
    if (!li) return;
    li.dataset.stage = stage;
    li.querySelector("i").style.width = `${STAGE[stage]}%`;
    li.querySelector(".sim__status").textContent = text || stage;
  }

  /* ---------- render (Fintech) ---------- */
  function render() {
    const r = reserveOf(state);

    // Ledger is append-only while a loan is open: history can't be un-earned.
    inp("purchases").min = state.debtKobo > 0 ? String(state.purchases) : "0";
    inp("profit").min = state.debtKobo > 0 ? String(state.profitKobo / 100) : "10";

    inp("purchases").value = state.purchases;
    inp("profit").value = state.profitKobo / 100;
    inp("trust").value = state.trust;
    out("purchases").textContent = state.purchases;
    out("profit").textContent = naira(state.profitKobo);
    out("trust").textContent = `${state.trust} / 100`;

    // The amount slider tops out at the full Safe Margin so you can try to over-borrow.
    const maxNaira = Math.max(1, Math.floor(r.cap / 100));
    const amountEl = inp("amount");
    amountEl.max = String(maxNaira);
    if (!amountNaira || amountNaira > maxNaira) amountNaira = Math.max(1, Math.floor(r.available / 100) || maxNaira);
    amountEl.value = amountNaira;
    out("amount").textContent = naira(amountNaira * 100);

    const locked = inp("lock").checked;
    out("lock").textContent = locked ? "ON: concurrent borrows are serialised" : "OFF: read-then-write race is possible";
    root.classList.toggle("is-unlocked", !locked);

    out("tier").textContent = r.tier.pct ? `${r.tier.name} tier · ${r.tier.pct}%` : "No tier yet · 0%";
    out("tier").dataset.tier = r.tier.name;
    root.querySelectorAll("[data-tier]").forEach((li) => li.classList.toggle("is-on", li.dataset.tier === r.tier.name));

    out("formula").innerHTML =
      `max(0, <b>${naira(r.lifetime)}</b> × ${r.tier.pct}% − <b>${naira(state.debtKobo)}</b>) = <em>${naira(r.available)}</em>`;

    const pct = (k) => (r.lifetime ? Math.min(100, (k / r.lifetime) * 100) : 0);
    $('[data-bar="cap"]').style.width = `${pct(r.cap)}%`;
    $('[data-bar="debt"]').style.width = `${pct(Math.min(state.debtKobo, r.cap))}%`;
    $('[data-bar="over"]').style.left = `${pct(r.cap)}%`;
    $('[data-bar="over"]').style.width = `${Math.max(0, pct(state.debtKobo) - pct(r.cap))}%`;

    out("available").textContent = naira(r.available);
    out("over").textContent = naira(r.overMargin);
    out("risk").textContent = naira(r.atRisk);
    out("over").classList.toggle("is-bad", r.overMargin > 0);
    out("risk").classList.toggle("is-bad", r.atRisk > 0);
    out("risk").classList.toggle("is-good", r.atRisk === 0);

    root.querySelectorAll("[data-act]").forEach((b) => {
      const act = b.dataset.act;
      b.disabled = busy || (act === "topup" && state.debtKobo === 0) || ((act === "borrow" || act === "race") && r.cap === 0);
    });
    root.querySelectorAll("[data-in]").forEach((i) => (i.disabled = busy));
  }

  /* ---------- one borrow = one transaction ---------- */
  async function borrowTx(id, amountKobo, useLock) {
    const body = async () => {
      lane(id, "read", "SELECT reserve…");
      await sleep(jitter(40, 110));
      const snapshot = reserveOf(state).available; // READ
      log(`R${id} SELECT available_reserve_kobo → ${naira(snapshot)}`);
      lane(id, "check", `saw ${naira(snapshot)}`);

      await sleep(jitter(380, 820)); // app logic + flaky 3G round-trip: the race window

      if (amountKobo > snapshot) {
        lane(id, "reject", "409 · insufficient reserve");
        log(`R${id} ROLLBACK: ${naira(amountKobo)} > ${naira(snapshot)}`, "fail");
        return false;
      }
      state.debtKobo += amountKobo; // INSERT loan; UPDATE active_debt_kobo
      lane(id, "commit", `201 · lent ${naira(amountKobo)}`);
      log(`R${id} COMMIT: lent ${naira(amountKobo)}`, "ok");
      render();
      return true;
    };

    lane(id, "begin", "BEGIN");
    await sleep(jitter(0, 40));
    if (!useLock) return body();
    return withLock(USER_ID, body, () => {
      lane(id, "wait", "waiting on lock…");
      log(`R${id} blocked by pg_advisory_xact_lock(${USER_ID})`, "wait");
    });
  }

  async function runBorrows(n) {
    if (busy) return;
    busy = true;
    const useLock = inp("lock").checked;
    const amountKobo = amountNaira * 100;
    const before = reserveOf(state);
    setupLanes(n);
    render();
    log(
      `── ${n === 1 ? "Borrow" : `${n} concurrent borrows`} of ${naira(amountKobo)} each · lock ${useLock ? "ON" : "OFF"} · reserve ${naira(before.available)}`,
      "head"
    );
    playTick(720);

    const results = await Promise.all(Array.from({ length: n }, (_, i) => borrowTx(i + 1, amountKobo, useLock)));

    const ok = results.filter(Boolean).length;
    const after = reserveOf(state);
    busy = false;
    render();

    if (after.overMargin > 0) {
      log(`✗ Invariant broken: debt exceeds Safe Margin by ${naira(after.overMargin)}`, "fail");
      if (after.atRisk > 0) log(`✗ ${naira(after.atRisk)} of the platform's own money is now at risk`, "fail");
      playPing(false);
      onToast?.(`Race won: ${ok}/${n} borrows passed. Turn the lock back on.`);
      root.classList.add("is-broken");
      setTimeout(() => root.classList.remove("is-broken"), 900);
    } else {
      log(`✓ ${ok}/${n} committed · invariant holds · capital at risk ${naira(after.atRisk)}`, "ok");
      playPing(true);
      if (n > 1) onToast?.(useLock ? "Lock held: zero over-lending ✳" : "Lucky timing. Try firing again.");
    }
  }

  /* ---------- Paystack webhook: next top-up repays debt first ---------- */
  function topUp() {
    if (busy || state.debtKobo === 0) return;
    const swept = Math.min(state.debtKobo, TOPUP_KOBO);
    state.debtKobo -= swept;
    log(`webhook charge.success ${naira(TOPUP_KOBO)} → swept ${naira(swept)} to debt, ${naira(TOPUP_KOBO - swept)} to wallet`, "ok");
    playTick(1100);
    render();
  }

  function reset() {
    if (busy) return;
    Object.assign(state, DEFAULTS);
    amountNaira = 0;
    inp("lock").checked = true;
    out("lanes").innerHTML = "";
    out("log").innerHTML = "";
    log("Ledger reset. Try to make the platform lose money.", "head");
    render();
  }

  /* ---------- wiring (Fintech) ---------- */
  inp("purchases").addEventListener("input", (e) => { state.purchases = Number(e.target.value) | 0; render(); });
  inp("profit").addEventListener("input", (e) => { state.profitKobo = (Number(e.target.value) | 0) * 100; render(); });
  inp("trust").addEventListener("input", (e) => { state.trust = Number(e.target.value) | 0; render(); });
  inp("amount").addEventListener("input", (e) => { amountNaira = Number(e.target.value) | 0; render(); });
  inp("lock").addEventListener("change", () => {
    log(`advisory lock ${inp("lock").checked ? "ENABLED" : "DISABLED (don't ship this)"}`, inp("lock").checked ? "ok" : "fail");
    playTick(inp("lock").checked ? 1200 : 540);
    render();
  });
  root.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "borrow") runBorrows(1);
    else if (act === "race") runBorrows(RACE_SIZE);
    else if (act === "topup") topUp();
    else if (act === "reset") reset();
  });

  /* ==========================================================================
     PANEL 2: VISION · EFitMi ISO-7810 & Cosine Yaw Guard
     ========================================================================== */
  const vin = (k) => $(`[data-vin="${k}"]`);
  const vout = (k) => $(`[data-vout="${k}"]`);
  const vCanvas = $(".sim__vcanvas");
  const vCtx = vCanvas?.getContext("2d");

  function renderVision() {
    const cardPx = Number(vin("cardPx").value);
    const trueShoulderCm = Number(vin("trueShoulder").value);
    const yawDeg = Number(vin("yaw").value);
    const guardOn = vin("guard").checked;

    const m = computeVisionMetrics({ cardPx, trueShoulderCm, yawDeg, guardOn });

    vout("cardPx").textContent = `${cardPx} px`;
    vout("trueShoulder").textContent = `${trueShoulderCm.toFixed(1)} cm`;
    vout("yaw").textContent = `${yawDeg > 0 ? "+" : ""}${yawDeg}°`;
    vout("guardLabel").textContent = guardOn
      ? "ON: rejects capture when torso yaw > 12°"
      : "OFF: silent cosine foreshortening allowed";

    const overLimit = Math.abs(yawDeg) > 12;
    vout("status").textContent = m.rejected
      ? `PostureError · ${Math.abs(yawDeg)}° > 12°`
      : overLimit
      ? "UNSAFE · Silently under-measured"
      : "LOCKED · Square posture";
    vout("status").dataset.tier = m.rejected || overLimit ? "Locked" : "Gold";

    vout("formula").innerHTML = m.rejected
      ? `<b>PostureError:</b> Torso rotated <b>${Math.abs(yawDeg)}°</b> (cos θ = ${Math.cos((yawDeg * Math.PI) / 180).toFixed(3)}). Stand square to camera.`
      : `8.56cm / <b>${cardPx}px</b> = ${m.cmPerPx.toFixed(4)} cm/px · 2D span = <b>${trueShoulderCm.toFixed(1)}cm</b> × cos(${Math.abs(yawDeg)}°) = <em>${m.apparentShoulderCm.toFixed(1)} cm</em>`;

    vout("scale").textContent = `${m.cmPerPx.toFixed(4)} cm/px`;
    vout("apparent").textContent = m.rejected ? "BLOCKED" : `${m.apparentShoulderCm.toFixed(1)} cm`;
    vout("error").textContent = `−${m.errorPct.toFixed(1)}% (${(trueShoulderCm - m.apparentShoulderCm).toFixed(1)} cm)`;

    vout("apparent").classList.toggle("is-bad", !m.rejected && overLimit);
    vout("apparent").classList.toggle("is-good", !m.rejected && !overLimit);
    vout("error").classList.toggle("is-bad", overLimit);
    vout("error").classList.toggle("is-good", !overLimit);

    if (vCtx && vCanvas) {
      const w = vCanvas.width, h = vCanvas.height;
      vCtx.clearRect(0, 0, w, h);
      const cx = w * 0.5, cy = h * 0.48;
      const halfSpanPx = Math.min(w * 0.34, trueShoulderCm * 3.1);
      const rad = (yawDeg * Math.PI) / 180;
      const lx = cx - Math.cos(rad) * halfSpanPx;
      const ly = cy - Math.sin(rad) * halfSpanPx * 0.55;
      const rx = cx + Math.cos(rad) * halfSpanPx;
      const ry = cy + Math.sin(rad) * halfSpanPx * 0.55;

      // 2D camera projection plane at bottom
      const projY = h - 24;
      vCtx.strokeStyle = "rgba(242,237,228,0.18)";
      vCtx.lineWidth = 1;
      vCtx.setLineDash([4, 4]);
      vCtx.beginPath();
      vCtx.moveTo(lx, ly); vCtx.lineTo(lx, projY);
      vCtx.moveTo(rx, ry); vCtx.lineTo(rx, projY);
      vCtx.stroke();
      vCtx.setLineDash([]);

      // Projected 2D width bar
      const color = overLimit ? "#ff5b1f" : "#3ddc97";
      vCtx.strokeStyle = color;
      vCtx.lineWidth = 3;
      vCtx.beginPath();
      vCtx.moveTo(lx, projY); vCtx.lineTo(rx, projY);
      vCtx.stroke();

      // Rotated 3D shoulder axis
      vCtx.strokeStyle = "#f2ede4";
      vCtx.lineWidth = 4;
      vCtx.beginPath();
      vCtx.moveTo(lx, ly); vCtx.lineTo(rx, ry);
      vCtx.stroke();

      // Acromion landmarks (11 & 12)
      [
        [lx, ly, "L11"],
        [rx, ry, "R12"],
      ].forEach(([x, y, lbl]) => {
        vCtx.fillStyle = color;
        vCtx.beginPath();
        vCtx.arc(x, y, 5.5, 0, Math.PI * 2);
        vCtx.fill();
        vCtx.fillStyle = "#bdb8ae";
        vCtx.font = "11px monospace";
        vCtx.fillText(lbl, x - 10, y - 10);
      });

      // ISO Card on sternum
      vCtx.fillStyle = "#ff5b1f";
      vCtx.fillRect(cx - 14, cy - 9, 28, 18);
    }
  }

  ["cardPx", "trueShoulder", "yaw"].forEach((k) => vin(k)?.addEventListener("input", renderVision));
  vin("guard")?.addEventListener("change", () => {
    playTick(vin("guard").checked ? 1150 : 560);
    renderVision();
  });
  root.addEventListener("click", (e) => {
    const vact = e.target.closest("[data-vact]")?.dataset.vact;
    if (vact === "square") {
      vin("yaw").value = "4";
      playTick(1050);
      renderVision();
    } else if (vact === "twist") {
      vin("yaw").value = "25";
      playPing(false);
      renderVision();
      onToast?.("25° twist: cosine foreshortening shrinks width by 9.4%");
    }
  });

  /* ==========================================================================
     PANEL 3: SOLANA · N-Reclaim SPL Rent Batch Sweeper
     ========================================================================== */
  const sin = (k) => $(`[data-sin="${k}"]`);
  const sout = (k) => $(`[data-sout="${k}"]`);
  let atas = [];

  function generateAtas() {
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const pub = (seed) =>
      Array.from({ length: 4 }, (_, i) => chars[(seed * 17 + i * 31) % chars.length]).join("") +
      "…" +
      Array.from({ length: 4 }, (_, i) => chars[(seed * 23 + i * 13 + 7) % chars.length]).join("");

    atas = Array.from({ length: 24 }, (_, i) => {
      const r = (i * 37 + 11) % 10;
      // ~75% zombie (0 bal + Kora auth), ~15% dust balance, ~10% revoked auth
      const state = r < 7 ? "zombie" : r < 9 ? "dust" : "revoked";
      return { id: i + 1, pubkey: pub(i + 1), state, closed: false };
    });
  }

  function slog(text, kind = "") {
    const el = sout("log");
    if (!el) return;
    const p = document.createElement("p");
    if (kind) p.className = `is-${kind}`;
    p.textContent = text;
    el.append(p);
    while (el.children.length > 30) el.firstChild.remove();
    el.scrollTop = el.scrollHeight;
  }

  function renderSolana() {
    const strict = sin("strict").checked;
    sout("strictLabel").textContent = strict
      ? "ON: two-phase pre-flight filter skips dust & user-owned ATAs"
      : "OFF: packs all 24 ATAs blindly (1 bad account aborts whole tx)";

    const safe = atas.filter((a) => !a.closed && a.state === "zombie");
    const dirty = atas.filter((a) => !a.closed && a.state !== "zombie");
    const txCount = Math.ceil((strict ? safe.length : atas.filter((a) => !a.closed).length) / MAX_IX_PER_TX);
    const reclaimSol = ((safe.length * RENT_LAMPORTS) / 1e9).toFixed(5);

    sout("summary").textContent = `${safe.length} zombies · ${dirty.length} unsafe`;
    sout("safeCount").textContent = `${safe.length} / ${atas.length} ATAs`;
    sout("txCount").textContent = `${txCount} Tx (≤18 IX)`;
    sout("sol").textContent = `${reclaimSol} SOL`;
    sout("sol").classList.toggle("is-good", safe.length > 0);

    sout("grid").innerHTML = atas
      .map((a) => {
        const badge = a.closed ? "CLOSED" : a.state === "zombie" ? "0 BAL · AUTH" : a.state === "dust" ? "BAL > 0" : "NO AUTH";
        return `<button type="button" class="sim__ata is-${a.closed ? "closed" : a.state}" data-ata-id="${a.id}" title="Click to toggle account state">
          <span class="sim__ata-key">${a.pubkey}</span>
          <span class="sim__ata-tag">${badge}</span>
        </button>`;
      })
      .join("");
  }

  function sweepSolana() {
    const strict = sin("strict").checked;
    const openAtas = atas.filter((a) => !a.closed);
    if (!openAtas.length) {
      slog("All reclaimable accounts already swept. Click 'New RPC Scan'.", "head");
      return;
    }

    if (!strict) {
      const bad = openAtas.find((a) => a.state !== "zombie");
      if (bad) {
        slog(
          `✗ Transaction simulation failed at ATA ${bad.pubkey} (${
            bad.state === "dust" ? "custom program error: 0x11 Non-zero token balance" : "Error: owner does not match closeAuthority"
          }). Whole 18-IX atomic batch aborted!`,
          "fail"
        );
        playPing(false);
        onToast?.("Atomic batch aborted: 1 dirty ATA failed the whole transaction");
        return;
      }
    }

    const candidates = openAtas.filter((a) => a.state === "zombie");
    const batch = candidates.slice(0, MAX_IX_PER_TX);
    batch.forEach((a) => (a.closed = true));
    const sol = ((batch.length * RENT_LAMPORTS) / 1e9).toFixed(6);
    slog(`✓ Packed ${batch.length} closeAccount IXs (${batch.length * 42 + 280}B < 1232B) → swept +${sol} SOL to Kora treasury`, "ok");
    playPing(true);
    onToast?.(`Swept +${sol} SOL across ${batch.length} ATAs ✳`);
    renderSolana();
  }

  sin("strict")?.addEventListener("change", () => {
    playTick(sin("strict").checked ? 1150 : 540);
    renderSolana();
  });

  root.addEventListener("click", (e) => {
    const ataBtn = e.target.closest("[data-ata-id]");
    if (ataBtn) {
      const item = atas.find((a) => a.id === Number(ataBtn.dataset.ataId));
      if (item && !item.closed) {
        const order = ["zombie", "dust", "revoked"];
        item.state = order[(order.indexOf(item.state) + 1) % order.length];
        playTick(880);
        renderSolana();
      }
      return;
    }
    const sact = e.target.closest("[data-sact]")?.dataset.sact;
    if (sact === "sweep") sweepSolana();
    else if (sact === "randomize") {
      generateAtas();
      sout("log").innerHTML = "";
      slog("RPC getProgramAccounts: discovered 24 Kora-sponsored ATAs.", "head");
      playTick(960);
      renderSolana();
    }
  });

  generateAtas();
  slog("RPC getProgramAccounts: discovered 24 Kora-sponsored ATAs. Click any tile to inject non-zero dust or revoke authority.", "head");
  renderSolana();

  log("Ledger loaded. Every amount is an integer number of kobo.", "head");
  render();
  renderVision();
  return { reset };
}
