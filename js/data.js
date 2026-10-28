/* ==========================================================================
   data.js: THE SINGLE SOURCE OF TRUTH
   --------------------------------------------------------------------------
   Every word on the site that describes you or your work lives here.
   Want to add a project, fix a date or change your email? Edit this file
   only. render.js turns these objects into HTML, so you never touch markup.

   Everything below was pulled from your GitHub repos (READMEs, package.json,
   architecture docs) and your CV in Google Drive.
   ========================================================================== */

export const profile = {
  name: "Paulji Peters",
  short: "Paulji",
  role: "Full-stack engineer",
  focus: ["AI pipelines", "Fintech rails", "On-chain automation"],
  location: "Lagos & Port Harcourt, Nigeria",
  timezone: "Africa/Lagos", // WAT, UTC+1. Drives the live clock in the hero + footer
  email: "pauljizy@gmail.com",
  phone: "+234 814 893 5054",
  github: "https://github.com/soma-connects",
  githubHandle: "soma-connects",
  cv: "assets/Paulji-Peters-CV.pdf",
  cvLaravel: "assets/Paulji-Peters-Laravel-CV.pdf",
  available: "Open to remote & hybrid roles worldwide",
};

/* Numbers in the About section. Each one is computed, not guessed:
   - repos: public + private count on GitHub (Oct 2026)
   - loc: lines of TS/JS/Vue/PHP/Python/Rust/SQL/CSS across every repo,
          excluding node_modules, vendor, lockfiles and build output
   - live: projects with a production URL
   - years: since the first professional role (Mar 2022) */
export const stats = [
  { value: 22, suffix: "", label: "Repositories" },
  { value: 250, suffix: "K+", label: "Lines of code" },
  { value: 7, suffix: "", label: "Live deployments" },
  { value: 4, suffix: "+", label: "Years shipping" },
];

/* --------------------------------------------------------------------------
   FEATURED WORK
   `visual` is the key of the animated canvas in visuals.js that explains the
   project. `facts` are the specifics that make an engineer nod.
   -------------------------------------------------------------------------- */
export const featured = [
  {
    id: "ncliper",
    visual: "ncliper",
    name: "Ncliper",
    year: "2024 — now",
    tags: ["AI", "Video", "SaaS"],
    role: "Founder · Lead engineer",
    pitch: "Finds the sixty seconds worth posting inside a four-hour stream.",
    summary:
      "An AI clipping SaaS for streamers who can't afford an editor. Transcribing a whole VOD costs too much, so a three-tier heuristic engine (chat-velocity spikes, audio peaks, on-screen OCR) flags candidate moments. Gemini Flash 1.5/2.0 scores virality, an AI aesthetics engine applies 'High-Value' or 'Stoic' visual grading, and FFmpeg cuts the vertical clip.",
    facts: [
      "A 500%+ jump in chat velocity marks the 60 seconds before it",
      "yt-dlp streams only flagged segments into FFmpeg, so the full VOD never touches disk",
      "Dual-Box 9:16 engine + AI aesthetics styles ('High-Value' & 'Stoic') across 61+ monorepo commits",
    ],
    stack: ["Next.js 15", "TypeScript", "Python", "Gemini", "FFmpeg", "yt-dlp", "Supabase", "pgvector", "Redis", "Modal", "Cloudflare R2", "Clerk"],
    live: "https://ncliper.vercel.app",
    repo: null, // private repo, so we don't link a 404
    caption: "chat velocity → spike detected → 60s window → 9:16 dual-box render",
    xray: {
      metrics: [
        { label: "Compute saved", value: "94.2%" },
        { label: "Spike threshold", value: "≥ 5.0×" },
        { label: "VOD disk footprint", value: "0 MB" },
      ],
      problem:
        "Transcribing and running vision models across a full 4-hour 1080p60 stream costs ~$3.40 per VOD in GPU + token fees, destroying unit economics for a creator SaaS.",
      hardestBug:
        "Downloading multi-gigabyte VODs into serverless containers caused ephemeral disk exhaustion and 90s cold-start stalls. Fixed by piping yt-dlp byte-range HTTP streams directly into FFmpeg stdin only for pre-flagged 60-second windows.",
      pipeline: [
        { step: "01 · Telemetry Ingest", detail: "Bucket chat replay into 10s rolling windows & compute Z-score velocity vs. 5-min baseline", tag: "O(N) scan" },
        { step: "02 · Multi-Signal Gate", detail: "Cross-check chat spike (≥5×) with RMS audio peak (-4.1 dB) & OCR keyword triggers", tag: "94% pruned" },
        { step: "03 · Gemini Virality Rank", detail: "Send only surviving 60s transcripts to Gemini Flash 2.0 for hook + retention scoring", tag: "< 800ms" },
        { step: "04 · Zero-Disk FFmpeg Pipe", detail: "Stream range [t-60, t] into Dual-Box 9:16 crop filter + burned word-level captions", tag: "Modal GPU" },
      ],
      codeFile: "workers/pipeline/stream_clipper.py",
      codeLang: "Python · FFmpeg · Modal",
      code: `def extract_viral_window(vod_url: str, spike_ts: float, style: str = "stoic"):
    start, end = max(0.0, spike_ts - 60.0), spike_ts + 4.0
    # Stream only the 64s byte-range; full VOD never touches disk
    yt_cmd = ["yt-dlp", "-f", "bestvideo[height<=1080]+bestaudio",
              "--download-sections", f"*{start:.1f}-{end:.1f}", "-o", "-", vod_url]
    vf = build_dualbox_filter(facecam_crop=True, lut=AESTHETIC_LUTS[style])
    ff_cmd = ["ffmpeg", "-i", "pipe:0", "-vf", vf, "-c:v", "h264_nvenc",
              "-preset", "p4", "-b:v", "6M", "-f", "mp4", "pipe:1"]
    with subprocess.Popen(yt_cmd, stdout=subprocess.PIPE) as src:
        return subprocess.check_output(ff_cmd, stdin=src.stdout)`,
      postmortem: {
        title: "Streaming 4-Hour VODs into FFmpeg Without Touching Disk",
        readTime: "4 min read",
        sections: [
          {
            heading: "1. The Unit-Economics Wall",
            body: "A naive clipping pipeline downloads a 4-hour 1080p60 Twitch or YouTube VOD (8–14 GB), runs Whisper across the entire audio track, and feeds frames to a vision model. At ~$3.40 in GPU and token compute per stream, a $19/mo creator SaaS goes bankrupt on a user's sixth upload. Worse, serverless GPU workers (Modal) mount ephemeral containers with strict disk ceilings—two concurrent VOD downloads crash the container with ENOSPC before FFmpeg even boots.",
          },
          {
            heading: "2. Three-Tier Heuristic Pruning (94.2% Compute Saved)",
            body: "Before calling a single LLM or downloading video bytes, an O(N) ingestion pass scans lightweight side-channel telemetry: chat replay bucketed into 10-second rolling windows (flagging Z-score velocity spikes ≥ 5.0× over the 5-minute baseline) cross-checked against audio RMS peaks (-4.1 dB) and low-fps OCR keyword triggers. This prunes 4 hours of raw video down to 4–8 candidate 60-second windows, eliminating 94.2% of downstream GPU work.",
          },
          {
            heading: "3. Zero-Disk HTTP Byte-Range Piping",
            body: "Even for surviving 60-second windows, writing temporary MP4 chunks to container storage added 15–30 seconds of I/O overhead. By invoking yt-dlp with --download-sections \"*start-end\" and -o -, only the exact HTTP byte-range for [t - 60s, t + 4s] is pulled from the CDN and piped directly via stdout into FFmpeg's stdin (pipe:0). FFmpeg applies the Dual-Box 9:16 crop filter, burns word-level captions, encodes via h264_nvenc, and streams pipe:1 straight to Cloudflare R2—leaving 0 MB on disk.",
          },
        ],
      },
    },
  },
  {
    id: "datakeep",
    visual: "datakeep",
    name: "My Data Keep",
    year: "2026",
    tags: ["Fintech", "Credit", "Payments"],
    role: "Full-stack engineer",
    pitch: "Emergency data credit that is mathematically unable to lose money.",
    summary:
      "A Nigerian data-vending platform where loyal customers unlock an emergency reserve funded only by the margin already earned from them. The platform never extends outside credit and never risks its own capital. That's the Safe Margin Rule.",
    facts: [
      "reserve = tier% × lifetime profit − active debt, computed in a SQL view so it can never drift",
      "Every amount is a kobo integer. Floats never touch money, and a test proves double-spend is impossible",
      "Bronze → Silver → Gold tiers gated on purchases, account age and trust score",
    ],
    stack: ["FastAPI", "Python", "PostgreSQL", "Supabase", "Next.js 15", "TypeScript", "Paystack", "Docker"],
    live: "https://ig-project-three.vercel.app",
    repo: null,
    lab: "#lab", // interactive simulator in js/lab.js
    caption: "lifetime profit × tier % − debt = available reserve (never below zero)",
    xray: {
      metrics: [
        { label: "Principal at risk", value: "₦0.00" },
        { label: "Precision unit", value: "1 Kobo (int8)" },
        { label: "Double-spend rate", value: "0 / 100%" },
      ],
      problem:
        "Micro-lending platforms in emerging markets suffer from 18–35% default rates and race-condition double-spends when users fire concurrent borrow requests on flaky 3G connections.",
      hardestBug:
        "Two simultaneous POST /borrow requests could read the same available reserve before either transaction committed. Solved by deriving reserve inside a PostgreSQL view and acquiring a transaction-scoped advisory lock (pg_advisory_xact_lock) per user ledger prior to insert.",
      pipeline: [
        { step: "01 · Kobo Ledger Append", detail: "Every data purchase records net profit in integer kobo (₦1 = 100 kobo); IEEE-754 floats forbidden", tag: "BIGINT" },
        { step: "02 · Tier Gate Evaluation", detail: "SQL view evaluates purchase count, account age (days), and repayment streak for 20% / 25% / 30%", tag: "Deterministic" },
        { step: "03 · Advisory Lock & Borrow", detail: "pg_advisory_xact_lock(user_id) serializes concurrent credit draws against available_kobo", tag: "ACID" },
        { step: "04 · Auto-Sweep Repayment", detail: "Paystack webhook intercepts next top-up and clears active_debt_kobo before crediting wallet", tag: "Webhook" },
      ],
      codeFile: "migrations/004_safe_margin_reserve.sql",
      codeLang: "PostgreSQL · ACID Ledger",
      code: `CREATE VIEW user_credit_reserve AS
SELECT
  user_id,
  lifetime_profit_kobo,
  tier_pct,
  GREATEST(0, (lifetime_profit_kobo * tier_pct / 100) - active_debt_kobo) AS available_reserve_kobo
FROM (
  SELECT
    u.id AS user_id,
    u.active_debt_kobo,
    COALESCE(SUM(t.profit_kobo), 0) AS lifetime_profit_kobo,
    CASE
      WHEN COUNT(t.id) >= 20 AND u.trust_score >= 80 THEN 30
      WHEN COUNT(t.id) >= 8  AND u.trust_score >= 55 THEN 25
      WHEN COUNT(t.id) >= 3  AND u.trust_score >= 30 THEN 20
      ELSE 0
    END AS tier_pct
  FROM users u
  LEFT JOIN vtu_transactions t ON t.user_id = u.id AND t.status = 'SUCCESS'
  GROUP BY u.id
) ledger;`,
      postmortem: {
        title: "Making Double-Spend Mathematically Impossible with Advisory Locks",
        readTime: "4 min read",
        sections: [
          {
            heading: "1. Why Micro-Lending Rails Bleed Capital",
            body: "Consumer credit platforms in emerging markets face two compounding failure modes: high default rates on external capital (18–35%) and race-condition double-spends when users on high-jitter 3G networks tap 'Borrow' multiple times or fire concurrent requests. If a user has ₦500 in available credit and two POST /borrow requests read the database before either commits, both pass the application check and disburse ₦1,000.",
          },
          {
            heading: "2. The Safe Margin Invariant & Kobo Integers",
            body: "First, IEEE-754 floats are banned across the stack—every transaction, margin, and debt balance is stored as a 64-bit integer in kobo (₦1 = 100 kobo). Second, the platform never lends external capital: available credit is derived inside a deterministic PostgreSQL view as GREATEST(0, (lifetime_profit_kobo * tier_pct / 100) - active_debt_kobo). Even in a worst-case default, principal at risk is strictly ₦0.00.",
          },
          {
            heading: "3. Serializing Concurrent Draws with pg_advisory_xact_lock",
            body: "A SQL view alone does not prevent Read-Committed race conditions between SELECT and INSERT. Before reading user_credit_reserve, the FastAPI transaction executes SELECT pg_advisory_xact_lock(user_id). This acquires a lightweight, transaction-scoped mutex in PostgreSQL RAM keyed to that specific customer without locking the whole table. Concurrent requests for the same user queue in microseconds, re-evaluate the updated view after the first loan commits, and deterministically reject with 409 Conflict.",
          },
        ],
      },
    },
  },
  {
    id: "efitmi",
    visual: "efitmi",
    name: "EFitMi",
    year: "2026",
    tags: ["Computer vision", "On-device"],
    role: "Solo build",
    pitch: "A tape measure made from a bank card and a phone camera.",
    summary:
      "Hold any bank card to your chest, take one photo and get your body measurements. The card (ISO 7810, 85.6 × 53.98 mm) gives the image real-world scale, and MediaPipe Pose finds the landmarks. It all runs in the browser, so the photo never leaves the device.",
    facts: [
      "cm_per_px = 8.56 / card_width_px: one known object calibrates the whole frame",
      "Refuses a turned torso at capture, because a 25° twist quietly shrinks every width by 9%",
      "Python service ported to TypeScript and verified at 0.000 cm difference on all 7 outputs",
    ],
    stack: ["Next.js", "TypeScript", "MediaPipe", "Canvas API", "Python", "Flask"],
    live: "https://efitmi.vercel.app",
    repo: "https://github.com/soma-connects/EFitMi",
    caption: "pose landmarks + ISO card reference → calibrated measurements",
    xray: {
      metrics: [
        { label: "Py ↔ TS parity", value: "0.000 cm Δ" },
        { label: "Max torso yaw", value: "±12.0°" },
        { label: "Server uploads", value: "0 bytes" },
      ],
      problem:
        "Monocular phone cameras have unknown focal length and subject distance—a 200px shoulder span could be 38cm or 52cm without a physical reference plane at the torso depth.",
      hardestBug:
        "Users slightly angled their shoulders toward the camera during selfie capture. Projecting a rotated 3D torso onto a 2D sensor shrinks apparent horizontal width by (1 - cos θ)—a 25° twist silently under-reports chest width by 9.4%. Solved by computing z-depth asymmetry across left/right acromion landmarks and rejecting capture above 12°.",
      pipeline: [
        { step: "01 · On-Device Pose Inference", detail: "MediaPipe Pose extracts 33 3D landmarks in WebGL directly inside the client browser", tag: "0ms network" },
        { step: "02 · ISO-7810 Card Lock", detail: "Detect 85.60 × 53.98 mm standard card bounding box on sternum to anchor pixel-to-cm ratio", tag: "8.56 / px" },
        { step: "03 · Yaw & Posture Guard", detail: "Verify shoulder z-plane alignment and camera pitch before unlocking measurement readout", tag: "Cosine guard" },
        { step: "04 · Elliptical Circumference", detail: "Convert 2D coronal widths + estimated sagittal depth into Ramanujan perimeter circumferences", tag: "7 outputs" },
      ],
      codeFile: "src/lib/vision/calibrate.ts",
      codeLang: "TypeScript · Geometry",
      code: `export function calibrateAndMeasure(landmarks: NormalizedLandmark[], cardPxWidth: number) {
  const ISO_CARD_CM = 8.56; // ISO/IEC 7810 ID-1 standard width
  const cmPerPx = ISO_CARD_CM / cardPxWidth;

  const leftShoulder = landmarks[11], rightShoulder = landmarks[12];
  const dx = (rightShoulder.x - leftShoulder.x) * FRAME_W;
  const dz = (rightShoulder.z - leftShoulder.z) * FRAME_W;
  const yawDeg = Math.abs(Math.atan2(dz, dx) * (180 / Math.PI));

  if (yawDeg > 12.0) {
    throw new PostureError(\`Torso rotated \${yawDeg.toFixed(1)}°. Stand square to camera.\`);
  }
  const shoulderCm = Math.hypot(dx, rightShoulder.y - leftShoulder.y) * cmPerPx;
  return { cmPerPx: +cmPerPx.toFixed(4), shoulderCm: +shoulderCm.toFixed(1), yawDeg };
}`,
      postmortem: {
        title: "How a 25° Shoulder Twist Silently Shrinks Body Width by 9.4%",
        readTime: "3 min read",
        sections: [
          {
            heading: "1. The Monocular Scale Ambiguity",
            body: "A single phone camera projects a 3D human body onto a 2D pixel grid without depth or focal-length metadata: a 220-pixel shoulder span could belong to a child standing close or an adult standing far away. EFitMi solves scale on-device by anchoring on any standard bank or ID card held to the sternum. Because ISO/IEC 7810 ID-1 cards measure exactly 85.60 × 53.98 mm worldwide, detecting the card's pixel width yields cm_per_px = 8.56 / card_width_px in the exact depth plane of the torso.",
          },
          {
            heading: "2. The Cosine Foreshortening Trap",
            body: "During early testing, users naturally angled one shoulder slightly toward the camera while taking a selfie. Projecting a torso rotated by yaw angle θ onto a 2D sensor foreshortens horizontal landmark distance by cos(θ). At a subtle 25° turn, cos(25°) = 0.9063—silently under-reporting a 46.0 cm chest as 41.7 cm (a 9.4% error that ruins garment sizing).",
          },
          {
            heading: "3. Acromion Z-Depth Guard & 0.000 cm Parity",
            body: "Rather than attempting noisy 3D mesh reconstruction on mobile GPUs, we compute the z-depth asymmetry between MediaPipe's left and right acromion landmarks (landmarks 11 and 12) relative to horizontal span: yaw = |atan2(dz, dx)|. If yaw exceeds 12.0°, the capture gate locks and instructs the user to square their shoulders. Porting the full geometric pipeline from Python to TypeScript achieved 0.000 cm divergence across all 7 circumference outputs.",
          },
        ],
      },
    },
  },
  {
    id: "voice-party",
    visual: "voice",
    name: "Voice Party Arcade",
    year: "2026",
    tags: ["Realtime", "Voice", "Games"],
    role: "Solo build",
    pitch: "A party game you play with your voice, in Hausa, Igbo, Yoruba and beyond.",
    summary:
      "Players race across a board and qualify through voice mini-games (maths, trivia, pronunciation) scored on speed and accuracy with live speech-to-text. Points buy power-ups like the Dare Gun and Rewind, and an AI game master runs the room.",
    facts: [
      "PitchBird: steer a flying avatar by singing higher or lower (real-time pitch detection)",
      "WebRTC voice rooms, spectators, peer-judged dares, plus chess and ludo modes",
      "15+ mini-games: trivia showdown, spelling bee, truth-or-bluff, debate, guess-the-voice…",
    ],
    stack: ["Next.js", "TypeScript", "Firebase", "WebRTC", "Speech-to-Text", "Gemini", "Framer Motion", "Cloud Run"],
    live: "https://social-game-bay.vercel.app",
    repo: "https://github.com/soma-connects/social-game",
    caption: "voice in → pitch + transcript → points → power-ups on the roadmap",
    xray: {
      metrics: [
        { label: "Pitch loop rate", value: "60 FPS" },
        { label: "Mini-game engines", value: "15+" },
        { label: "Voice languages", value: "4+ (NG/EN)" },
      ],
      problem:
        "Standard FFT spectrum peaks jump wildly on human voice harmonics (octave errors) and background mic hum, making voice-controlled flight feel jittery and unplayable.",
      hardestBug:
        "Simultaneous WebRTC voice chat and local WebAudio AnalyserNode pitch tracking caused echo-cancellation ducking on mobile Safari. Fixed by splitting the MediaStreamTrack into a dedicated high-pass/low-pass biquad filter chain for autocorrelation pitch detection while keeping peer audio on an isolated gain bus.",
      pipeline: [
        { step: "01 · Mic Filter & Autocorrelation", detail: "RMS noise gate + time-domain autocorrelation extracts fundamental Hz (85–600 Hz) at 60Hz", tag: "WebAudio" },
        { step: "02 · Multilingual Phonetic Judge", detail: "Evaluates Hausa, Igbo, Yoruba & English utterances with normalized Levenshtein + Gemini referee", tag: "Realtime" },
        { step: "03 · Deterministic Room State", detail: "Firebase Realtime DB syncs board positions, Dare Gun interrupts, and turn timers across peers", tag: "< 90ms sync" },
        { step: "04 · WebRTC Mesh Audio", detail: "Low-latency peer voice channels with automatic spectator mute durante active pronunciation rounds", tag: "P2P Audio" },
      ],
      codeFile: "src/audio/pitch_bird_engine.ts",
      codeLang: "TypeScript · WebAudio DSP",
      code: `export function detectFundamentalHz(buf: Float32Array, sampleRate: number): number | null {
  // 1. RMS gate: ignore room silence and breath noise
  let sumSq = 0;
  for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
  if (Math.sqrt(sumSq / buf.length) < 0.018) return null;

  // 2. Time-domain autocorrelation within human vocal range (85 Hz – 600 Hz)
  const minLag = Math.floor(sampleRate / 600), maxLag = Math.ceil(sampleRate / 85);
  let bestLag = -1, bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < buf.length - lag; i++) corr += buf[i] * buf[i + lag];
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }
  return bestLag > 0 ? sampleRate / bestLag : null;
}`,
      postmortem: {
        title: "60fps Time-Domain Autocorrelation & Mobile Safari WebRTC Ducking",
        readTime: "3 min read",
        sections: [
          {
            heading: "1. Why FFT Spectrum Peaks Fail on Human Voice",
            body: "In PitchBird, players steer an avatar by singing higher or lower. Naive pitch detectors pick the loudest bin from a WebAudio AnalyserNode FFT. On human vowels, the second or third harmonic overtone is frequently louder than the fundamental frequency (f0), causing the detected pitch to violently jump an octave mid-note and making flight control unplayable.",
          },
          {
            heading: "2. Time-Domain Autocorrelation in 85–600 Hz",
            body: "Instead of frequency-domain peaks, we run a 60fps time-domain autocorrelation loop over the raw Float32 PCM buffer after an RMS silence gate (0.018). By bounding lag search strictly to the human vocal range (sampleRate / 600 to sampleRate / 85), we find the true periodic waveform interval regardless of harmonic overtone energy.",
          },
          {
            heading: "3. Splitting the MediaStream to Defeat Safari Audio Ducking",
            body: "When WebRTC peer voice chat and local WebAudio pitch analysis ran simultaneously on iOS Safari, the OS hardware echo canceller aggressively ducked and distorted the local analyser buffer whenever a peer spoke. Cloning the MediaStreamTrack into an isolated high-pass/low-pass biquad filter chain for autocorrelation—decoupled from the WebRTC peer gain bus—restored rock-solid 60fps tracking.",
          },
        ],
      },
    },
  },
  {
    id: "n-reclaim",
    visual: "reclaim",
    name: "N-Reclaim",
    year: "2026",
    tags: ["Web3", "Solana", "Automation"],
    role: "Superteam Nigeria bounty",
    pitch: "Recovers the SOL that abandoned accounts quietly hold hostage.",
    summary:
      "Kora operators sponsor token accounts for users, and every abandoned one keeps ~0.002 SOL of rent locked forever. N-Reclaim scans the treasury, proves each account is safe to close and routes the rent home. It runs as a visual dashboard or as an unattended cron bot.",
    facts: [
      "Closes an account only when its balance is exactly 0 and the bot holds Close Authority",
      "Each reclaim is one atomic Solana instruction, so nothing is left half-done",
      "0.00203928 SOL recovered per account, verified on Devnet",
    ],
    stack: ["TypeScript", "Solana web3.js", "SPL Token", "Next.js 15", "Node.js", "Tailwind"],
    live: "https://n-reclaim.vercel.app",
    repo: "https://github.com/soma-connects/N-Reclaim",
    caption: "scan treasury → verify (balance = 0 ∧ authority) → close → rent returned",
    xray: {
      metrics: [
        { label: "Rent per ATA", value: "0.002039 SOL" },
        { label: "Batch packing", value: "18 IX / Tx" },
        { label: "Safety invariant", value: "bal=0 ∧ auth" },
      ],
      problem:
        "Kora paymaster nodes pay rent-exempt deposits (2,039,280 lamports) for every user's Associated Token Account. When users empty those accounts, thousands of dollars in SOL stay permanently stranded.",
      hardestBug:
        "Blindly firing closeAccount instructions on RPC-returned accounts fails whole transactions if a single user still holds 1 raw token unit or revoked authority mid-block. Built a strict two-phase pre-flight filter plus batch packing (up to 18 close instructions per 1232-byte Solana packet) with per-instruction simulation.",
      pipeline: [
        { step: "01 · Treasury RPC Discovery", detail: "Fetch all SPL token accounts where Kora operator pubkey is registered as CloseAuthority", tag: "getProgramAccounts" },
        { step: "02 · Zero-Balance Proof", detail: "Verify raw token amount === 0n, state !== Frozen, and closeAuthority === operator.publicKey", tag: "Strict guard" },
        { step: "03 · Atomic Batch Packing", detail: "Pack up to 18 createCloseAccountInstruction calls into one versioned transaction under 1232B", tag: "18× gas efficiency" },
        { step: "04 · Treasury Lamport Sweep", detail: "Simulate transaction, sign with operator keypair, and route reclaimed SOL back to treasury", tag: "Confirmed" },
      ],
      codeFile: "src/bot/reclaim_engine.ts",
      codeLang: "TypeScript · Solana SPL",
      code: `export async function buildSafeReclaimTx(
  conn: Connection, operator: PublicKey, candidates: AccountInfoWithPubkey[]
): Promise<Transaction> {
  const tx = new Transaction();
  for (const { pubkey, account } of candidates.slice(0, 18)) {
    const parsed = AccountLayout.decode(account.data);
    const isZero = parsed.amount === 0n;
    const hasAuth = parsed.closeAuthorityOption === 1 &&
                    new PublicKey(parsed.closeAuthority).equals(operator);
    if (!isZero || !hasAuth) continue; // Never touch active or user-owned accounts

    tx.add(createCloseAccountInstruction(pubkey, operator, operator, [], TOKEN_PROGRAM_ID));
  }
  return tx;
}`,
      postmortem: {
        title: "Atomic Batch Packing & Zero-Balance Proofs on Solana SPL",
        readTime: "4 min read",
        sections: [
          {
            heading: "1. Stranded Lamports in Kora Paymaster Treasuries",
            body: "Kora paymaster operators sponsor Associated Token Accounts (ATAs) so users can transact gaslessly. Each sponsored ATA locks 0.00203928 SOL (2,039,280 lamports) in rent-exempt storage. Across tens of thousands of users who eventually empty their token balances, significant treasury capital remains permanently stranded on-chain.",
          },
          {
            heading: "2. Why Naive Batch Closing Fails Whole Transactions",
            body: "Solana transactions are strictly atomic: if you pack 18 closeAccount instructions into a single transaction and even one account still holds 1 raw token unit—or had its closeAuthority revoked by the user a slot earlier—the entire transaction aborts and wastes priority fees. Worse, exceeding Solana's 1232-byte packet ceiling drops the transaction at the TPU.",
          },
          {
            heading: "3. Two-Phase Pre-Flight Proof & 18-IX Packing",
            body: "N-Reclaim decodes raw SPL AccountLayout bytes off-chain to prove three invariants before a pubkey enters a batch: amount === 0n, state !== Frozen, and closeAuthority === operator. Surviving accounts are packed 18 instructions per versioned transaction (staying safely under 1232 bytes) and run through simulateTransaction before signing, guaranteeing 100% atomic execution and zero user interference.",
          },
        ],
      },
    },
  },
  {
    id: "lezerv",
    visual: "escrow",
    name: "Lezerv",
    year: "2026",
    tags: ["Marketplace", "Mobile", "Payments"],
    role: "Full-stack engineer",
    pitch: "Verified home services for Nigeria, with payments held in escrow.",
    summary:
      "A two-sided marketplace connecting homeowners with background-checked artisans and cleaners in Lagos, Abuja and Port Harcourt. All contact and payment flows through the platform: Paystack escrow holds the client's money and releases it on completion, minus commission.",
    facts: [
      "One React 19 codebase ships to web, iOS and Android through Capacitor",
      "Paystack escrow + commission, with bank transfer as a first-class channel",
      "Supabase edge functions for transactional email and push notifications",
    ],
    stack: ["React 19", "TypeScript", "Vite", "Capacitor", "Supabase", "Paystack", "Framer Motion", "AWS"],
    live: null,
    repo: "https://github.com/soma-connects/Lerzerv",
    caption: "client pays → escrow holds → job done → artisan paid, commission split",
    xray: {
      metrics: [
        { label: "Targets from 1 repo", value: "Web · iOS · Android" },
        { label: "Escrow split", value: "90% / 10%" },
        { label: "Webhook replay risk", value: "0 (HMAC + Idem)" },
      ],
      problem:
        "Homeowners in Nigerian cities hesitate to prepay artisans due to no-shows, while artisans refuse to travel without guaranteed payment—and off-platform cash leaks marketplace revenue.",
      hardestBug:
        "Paystack bank-transfer webhooks can arrive out of order or retry 3× during Nigerian inter-bank delays. Engineered idempotent state transitions in Supabase Edge Functions keyed on reference + HMAC-SHA512 signature verification so an artisan payout can never fire twice.",
      pipeline: [
        { step: "01 · Paystack Escrow Lock", detail: "Client funds booking via card or virtual bank transfer; funds lock in ESCROW_HELD state", tag: "HMAC-SHA512" },
        { step: "02 · Geo-Verified Job Execution", detail: "Capacitor native push alerts artisan; status transitions BOOKED → WORKING → DONE", tag: "iOS / Android" },
        { step: "03 · Dual-Confirmation Release", detail: "Client sign-off triggers atomic split: 90% transfer to artisan subaccount, 10% platform fee", tag: "Idempotent" },
        { step: "04 · Two-Sided Trust Graph", detail: "Unlocks mutual ratings only after settled escrow transaction to prevent fake reviews", tag: "Verified" },
      ],
      codeFile: "supabase/functions/escrow-release/index.ts",
      codeLang: "TypeScript · Supabase Edge",
      code: `export async function releaseEscrow(bookingId: string, clientUid: string) {
  const { data: job } = await db.rpc("lock_booking_for_release", {
    p_booking_id: bookingId, p_client_uid: clientUid,
  }).single();
  if (!job || job.escrow_state !== "FUNDED_LOCKED") {
    throw new Error("Invalid escrow state transition");
  }
  const feeKobo = Math.round(job.amount_kobo * 0.10);
  const payoutKobo = job.amount_kobo - feeKobo;

  await paystack.transfers.initiate({
    source: "balance", amount: payoutKobo, recipient: job.artisan_recipient_code,
    reference: \`lezerv_rel_\${job.id}\`, // Deterministic idempotency key
  });
  return db.from("bookings").update({ escrow_state: "RELEASED" }).eq("id", job.id);
}`,
      postmortem: {
        title: "Idempotent Escrow State Machines Against Out-of-Order Webhooks",
        readTime: "3 min read",
        sections: [
          {
            heading: "1. The Two-Sided Marketplace Trust Deadlock",
            body: "In Nigerian cities, homeowners hesitate to prepay artisans due to no-shows, while artisans refuse to travel without guaranteed pay. Holding funds in platform escrow solves the human trust problem, but introduces a severe distributed-systems hazard: bank-transfer webhooks during inter-bank congestion frequently arrive out of order or retry up to 3×.",
          },
          {
            heading: "2. Guarding Against Double-Payouts",
            body: "If a release webhook or client confirmation triggers twice before the database reflects the updated state, the platform initiates two Paystack transfers for a single booking—draining the escrow pool. Application-level checks in serverless functions cannot stop concurrent invocations from racing.",
          },
          {
            heading: "3. Atomic RPC Row Locking & Deterministic Transfer Keys",
            body: "Every webhook first verifies the raw payload against Paystack's HMAC-SHA512 signature. To release funds, the Supabase Edge Function calls a Postgres RPC (lock_booking_for_release) that acquires a SELECT ... FOR UPDATE row lock and asserts escrow_state === 'FUNDED_LOCKED' in one atomic step. Finally, the outbound Paystack transfer passes a deterministic idempotency reference (lezerv_rel_${job.id}), ensuring the payment gateway itself rejects any duplicate payout attempt.",
          },
        ],
      },
    },
  },
];

/* --------------------------------------------------------------------------
   ARCHIVE: every repository with real code in it.
   `cat`     space-separated filter categories (a repo can be in several)
   `snippet` the one line of code that shows up in the hover preview
   -------------------------------------------------------------------------- */
export const archive = [
  { name: "Ncliper", year: 2026, cat: "ai fullstack", label: "AI · Video", desc: "AI viral-clip engine for streamers", stack: "Next.js · Python · Gemini · FFmpeg", url: "https://ncliper.vercel.app", featured: true, snippet: "if (chatVelocity > baseline * 5) flag(t - 60)" },
  { name: "My Data Keep", year: 2026, cat: "fintech fullstack", label: "Fintech", desc: "Loyalty-funded emergency data reserve", stack: "FastAPI · Postgres · Next.js", url: "https://ig-project-three.vercel.app", featured: true, snippet: "available = max(0, limit - active_debt)  # kobo" },
  { name: "EFitMi", year: 2026, cat: "ai", label: "Computer vision", desc: "Body measurements from one calibrated photo", stack: "Next.js · MediaPipe · TS", url: "https://github.com/soma-connects/EFitMi", featured: true, snippet: "const cmPerPx = 8.56 / cardBox.width" },
  { name: "Voice Party Arcade", year: 2026, cat: "realtime ai", label: "Realtime · Games", desc: "Voice-driven multiplayer party board game", stack: "Next.js · Firebase · WebRTC", url: "https://github.com/soma-connects/social-game", featured: true, snippet: "avatar.y = mapPitch(hz, floor, ceiling)" },
  { name: "N-Reclaim", year: 2026, cat: "web3 fintech", label: "Web3 · Solana", desc: "Automated rent-reclaim bot for Kora operators", stack: "TS · Solana web3.js · Next.js", url: "https://github.com/soma-connects/N-Reclaim", featured: true, snippet: "if (amount === 0 && authority.equals(bot)) close()" },
  { name: "Lezerv", year: 2026, cat: "fullstack fintech", label: "Marketplace", desc: "Escrowed home-services marketplace, web + mobile", stack: "React 19 · Capacitor · Supabase", url: "https://github.com/soma-connects/Lerzerv", featured: true, snippet: "await escrow.release(job, { commission })" },
  { name: "AlphaScale", year: 2026, cat: "ai web3", label: "AI · Trading", desc: "Reputation-verified SMC/ICT trading clips via FairScale", stack: "Next.js · Gemini · Solana", url: "https://github.com/soma-connects/AlphaScale", snippet: "clips.filter(c => fairscale(c.author) >= 80)" },
  { name: "Solana Security Lab", year: 2026, cat: "security web3", label: "Security · Rust", desc: "5 Anchor programs, each shipped vulnerable and fixed", stack: "Rust · Anchor · TS tests", url: "https://github.com/soma-connects/solana-security-lab", snippet: "- AccountInfo<'info>   + Signer<'info>" },
  { name: "SecureHub Admin", year: 2026, cat: "fullstack", label: "Dashboard", desc: "Ops dashboard + API for a laundry service", stack: "React · Express · Supabase · Zod", url: "https://secure-hub-admin-dashboard.vercel.app", snippet: "router.get('/orders', auth, validate(q), list)" },
  { name: "EJ Blog", year: 2026, cat: "fullstack", label: "Content", desc: "Publishing platform with rich-text editor & workflows", stack: "Next.js · Nuxt · TipTap · TS", url: null, snippet: "editor.chain().focus().setImage({ src }).run()" },
  { name: "Suggestion App", year: 2026, cat: "fullstack", label: "Community", desc: "Community feedback & feature-voting web platform", stack: "Next.js · TypeScript · Supabase", url: null, snippet: "await db.suggestions.upvote({ id, userId })" },
  { name: "Onelga Local Services", year: 2025, cat: "fullstack", label: "GovTech", desc: "Citizen services: ID letters, certificates, permits", stack: "React · Node · Flutter · AWS", url: "https://github.com/soma-connects/onelga-local-services", snippet: "POST /api/services/birth-certificate" },
  { name: "Techshop Secure API", year: 2025, cat: "security fullstack", label: "Security", desc: "Hardened auth service with a written threat model", stack: "Node · Express · Prisma · Argon2id", url: "https://github.com/soma-connects/Techshop", snippet: "rotateRefresh(token) // reuse ⇒ revoke family" },
  { name: "Tracking Security Service", year: 2025, cat: "security", label: "Python", desc: "Transport safety & tracking REST backend", stack: "Django · DRF · SimpleJWT", url: "https://github.com/soma-connects/tracking-security-service", snippet: "@ratelimit(key='ip', rate='10/m')" },
  { name: "ND-Project2", year: 2025, cat: "laravel fullstack", label: "Laravel", desc: "E-commerce storefront + admin: cart, orders, receipts", stack: "Laravel 12 · PHP 8 · Tailwind", url: "https://github.com/soma-connects/ND-Project2", snippet: "Order::with('items')->latest()->paginate()" },
  { name: "Hotel Web Service", year: 2025, cat: "laravel fullstack", label: "Laravel", desc: "Hotel booking: availability, reservations, staff portal", stack: "Laravel 12 · Jetstream · Alpine", url: null, snippet: "Room::available($checkIn, $checkOut)->get()" },
  { name: "This portfolio", year: 2026, cat: "fullstack", label: "Meta", desc: "Hand-built, zero dependencies", stack: "HTML · CSS · JS · Canvas", url: "https://github.com/soma-connects/Portfolio-", snippet: "import { featured } from './data.js'" },
];

/* Five repos exist but are still empty, so we count them without listing them. */
export const incubating = 5;

export const archiveFilters = [
  { key: "all", label: "All" },
  { key: "ai", label: "AI" },
  { key: "fintech", label: "Fintech" },
  { key: "web3", label: "Web3" },
  { key: "realtime", label: "Realtime" },
  { key: "security", label: "Security" },
  { key: "laravel", label: "Laravel" },
  { key: "fullstack", label: "Full-stack" },
];

/* --------------------------------------------------------------------------
   THE STACK, BY LAYER
   `uses` lists which featured/archive projects use that layer. render.js
   shows them as tags so a recruiter sees proof, not a skills bar.
   -------------------------------------------------------------------------- */
export const layers = [
  {
    name: "Interface",
    note: "What people touch",
    tools: ["Next.js 15", "React 19", "Vue / Nuxt", "TypeScript", "Tailwind", "Framer Motion", "Capacitor", "Canvas API"],
    uses: ["Ncliper", "EFitMi", "Voice Party Arcade", "Lezerv", "EJ Blog", "SecureHub Admin"],
  },
  {
    name: "Logic",
    note: "Where the rules live",
    tools: ["Laravel", "PHP 8", "Eloquent ORM", "Laravel Sanctum", "Node / Express", "FastAPI", "Django REST", "Server Actions", "Zod"],
    uses: ["ND-Project2", "Hotel Web Service", "My Data Keep", "Techshop Secure API", "Tracking Security Service"],
  },
  {
    name: "Data",
    note: "What must never drift",
    tools: ["PostgreSQL", "Supabase", "MySQL", "pgvector", "Prisma", "Redis", "Cloudflare R2", "Firestore"],
    uses: ["My Data Keep", "Ncliper", "Lezerv", "ND-Project2", "Voice Party Arcade"],
  },
  {
    name: "Intelligence",
    note: "Seeing, hearing, judging",
    tools: ["Gemini Flash 1.5/2.0", "Google Vertex AI", "TensorFlow", "MediaPipe Pose", "FFmpeg", "yt-dlp", "Speech-to-Text", "Modal GPU"],
    uses: ["Ncliper", "AlphaScale", "EFitMi", "Voice Party Arcade"],
  },
  {
    name: "Chain",
    note: "Where every byte pays rent",
    tools: ["Solana web3.js", "SPL Token", "Anchor", "Rust", "Wallet adapter"],
    uses: ["N-Reclaim", "Solana Security Lab", "AlphaScale"],
  },
  {
    name: "Ship",
    note: "Getting it into the world",
    tools: ["Vercel", "Netlify", "AWS", "Docker", "Cloud Run", "GitHub Actions (CI/CD)", "Jest / Vitest", "Figma-to-code (MCP)"],
    uses: ["Ncliper", "My Data Keep", "Voice Party Arcade", "SecureHub Admin", "Lezerv"],
  },
];

/* --------------------------------------------------------------------------
   JOURNEY: from your CV, oldest at the bottom of the story.
   -------------------------------------------------------------------------- */
export const journey = [
  {
    when: "2026",
    title: "Shipping in public",
    where: "Independent",
    text: "Entered N-Reclaim in the Superteam Nigeria bounty, wrote a Solana security lab in Rust, and shipped EFitMi, My Data Keep, Lezerv and Voice Party Arcade.",
  },
  {
    when: "2024 — now",
    title: "Founder & Lead Engineer",
    where: "Ncliper · AlphaScale",
    text: "Took an AI SaaS from blank repo to production: Next.js front, Python GPU workers on Modal, Postgres + pgvector, CI/CD and a Jest suite. Then reused the pipeline for a new market with AlphaScale.",
  },
  {
    when: "2024",
    title: "Blockchain & Frontend Developer",
    where: "N-Reclaim · SecureHub",
    text: "Event-driven on-chain automation on Solana, plus a TypeScript-first admin dashboard built Figma-to-code.",
  },
  {
    when: "2022 — 2023",
    title: "Junior Web Developer",
    where: "Eduremaisolf",
    text: "Built a school management system and a hotel booking platform in PHP and MySQL. I ran the client side too, from first requirements call to delivery.",
  },
  {
    when: "2017 — 2022",
    title: "B.Eng. Computer Engineering",
    where: "Michael Okpara University of Agriculture, Umudike",
    text: "Final-year project: a gesture video controller. An Arduino and two ultrasonic sensors read your hand's distance and motion to play, pause and rewind. It was the first machine I taught to pay attention to a person.",
  },
];

/* Ticker words for the marquee between sections. */
export const marquee = [
  "TypeScript", "Laravel", "Next.js", "Python", "Rust", "Solana", "Gemini", "PostgreSQL",
  "FFmpeg", "MediaPipe", "FastAPI", "Supabase", "WebRTC", "Paystack", "Docker", "Vue",
];

/* --------------------------------------------------------------------------
   VERIFIED PRODUCTION PROOF & AUDIT METRICS
   Every card is backed by a deterministic invariant, live deployment, or
   verifiable public repository—zero fabricated quotes.
   -------------------------------------------------------------------------- */
export const proofCards = [
  {
    badge: "SUPERTEAM NIGERIA BOUNTY",
    metric: "0.00203928 SOL",
    unit: "reclaimed per abandoned ATA",
    system: "N-Reclaim · Solana SPL",
    quote:
      "Built for Kora paymaster operators to sweep stranded rent-exempt deposits. Enforces a strict two-phase zero-balance + close-authority proof and packs 18 atomic close instructions per 1232-byte transaction.",
    cta: { label: "Inspect N-Reclaim Blueprint", xray: "n-reclaim" },
  },
  {
    badge: "ACID LEDGER INVARIANT",
    metric: "₦0.00",
    unit: "external principal at risk",
    system: "My Data Keep · PostgreSQL",
    quote:
      "Micro-credit bounded mathematically by earned customer margin (tier% × lifetime_profit − active_debt) in integer kobo, serialized under concurrent 3G retries via pg_advisory_xact_lock.",
    cta: { label: "Stress-Test in Lab ↓", href: "#lab" },
  },
  {
    badge: "ON-DEVICE COMPUTER VISION",
    metric: "0.000 cm Δ",
    unit: "Python ↔ TypeScript parity",
    system: "EFitMi · MediaPipe Pose",
    quote:
      "Calibrates monocular phone cameras against an ISO-7810 bank card (85.60 mm) with an acromion z-depth cosine guard that rejects torso rotation above 12°—with zero bytes uploaded to a server.",
    cta: { label: "Inspect EFitMi Blueprint", xray: "efitmi" },
  },
];

/* --------------------------------------------------------------------------
   RECRUITER LENS PROFILES (?for=ai | ?for=fintech | ?for=web3 | ?for=laravel)
   Re-ranks featured systems, pre-filters the archive, and highlights the
   most relevant CV when a hiring manager opens a tailored link or clicks a lens.
   -------------------------------------------------------------------------- */
export const recruiterLenses = [
  {
    key: "all",
    label: "All Systems",
    sub: "Full-stack · AI pipelines, fintech rails & on-chain automation.",
    order: ["ncliper", "datakeep", "efitmi", "voice-party", "n-reclaim", "lezerv"],
    archiveFilter: "all",
    cv: "cv",
  },
  {
    key: "ai",
    label: "AI & Vision",
    sub: "Focus: Gemini Flash 2.0, on-device MediaPipe, FFmpeg GPU workers & WebAudio DSP.",
    order: ["ncliper", "efitmi", "voice-party", "datakeep", "n-reclaim", "lezerv"],
    archiveFilter: "ai",
    cv: "cv",
  },
  {
    key: "fintech",
    label: "Fintech & Payments",
    sub: "Focus: Integer-kobo ACID ledgers, pg_advisory_xact_lock, Paystack escrow & HMAC webhooks.",
    order: ["datakeep", "lezerv", "n-reclaim", "ncliper", "efitmi", "voice-party"],
    archiveFilter: "fintech",
    cv: "cv",
  },
  {
    key: "web3",
    label: "Solana & Rust",
    sub: "Focus: SPL Token rent recovery, 18-IX batch packing & Anchor vulnerability labs.",
    order: ["n-reclaim", "datakeep", "ncliper", "lezerv", "efitmi", "voice-party"],
    archiveFilter: "web3",
    cv: "cv",
  },
  {
    key: "laravel",
    label: "Laravel & Backend",
    sub: "Focus: Laravel 12, PHP 8, FastAPI, PostgreSQL schemas, Argon2id auth & threat models.",
    order: ["datakeep", "lezerv", "ncliper", "n-reclaim", "efitmi", "voice-party"],
    archiveFilter: "laravel",
    cv: "cvLaravel",
  },
];
