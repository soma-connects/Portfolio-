/* ==========================================================================
   data.js: THE SINGLE SOURCE OF TRUTH
   --------------------------------------------------------------------------
   Every word on the site that describes you or your work lives here.
   Want to add a project, fix a date or change your email? Edit this file
   only. render.js turns these objects into HTML, so you never touch markup.

   Sources: the soma-connects GitHub repositories (READMEs, package.json,
   architecture docs, the running apps) and your CV.
   ========================================================================== */

export const profile = {
  name: "Paulji Peters",
  short: "Paulji",
  role: "Full-stack engineer",
  focus: ["AI pipelines", "Marketplaces", "On-chain automation"],
  location: "Port Harcourt, Nigeria",
  timezone: "Africa/Lagos", // WAT, UTC+1. Drives the live clock in the hero + footer
  email: "pauljizy@gmail.com",
  github: "https://github.com/soma-connects",
  githubHandle: "soma-connects",
  available: "Open to remote roles & contracts worldwide",
};

/* Numbers in the About section. Each one is computed, not guessed:
   - repos: public + private count on GitHub (Nov 2026)
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
   shots:   real screenshots of the running apps (assets/work), shown in the figure
   gallery: extra screens inside the case study
   visual:  key of the animated "how it works" diagram in visuals.js
   captureNote: how the screens were captured, shown in the case study
   -------------------------------------------------------------------------- */
export const featured = [
  {
    id: "ncliper",
    visual: "ncliper",
    name: "Ncliper",
    year: "2024 — now",
    tags: ["AI", "Video", "SaaS"],
    role: "Founder · Lead engineer",
    pitch: "Clips a streamer's best moment before they blink.",
    summary:
      "An AI clipping SaaS for MLBB, League of Legends and Dota 2 creators who can't afford an editor. Instead of guessing with AI over a four-hour VOD, it asks the games: match APIs give ground-truth timestamps for pentakills, lord steals and clutch plays. Chat spikes and audio peaks back that up, Gemini judges the hook, and FFmpeg cuts a vertical clip.",
    facts: [
      "Riot MATCH-V5 and OpenDota supply the kill timestamps, so detection starts from facts, not a model's guess",
      "yt-dlp pulls only the flagged segments into FFmpeg; the full VOD never touches disk",
      "Dual-Box render: facecam in the top third, gameplay in the bottom two-thirds of a 9:16 frame",
    ],
    stack: ["Next.js 15", "TypeScript", "Python", "Gemini", "FFmpeg", "yt-dlp", "Supabase", "pgvector", "Upstash Redis", "Modal", "Cloudflare R2", "Clerk"],
    live: "https://ncliper.vercel.app",
    repo: null, // private repo, so we don't link a 404
    shots: { desk: "assets/work/ncliper-desk.webp", phone: "assets/work/ncliper-phone.webp" },
    gallery: ["assets/work/ncliper-pricing.webp", "assets/work/ncliper-phone.webp"],
    captureNote: "Screens captured from the app running locally with placeholder keys.",
    caption: "chat velocity → spike detected → 60s window → 9:16 dual-box render",
  },
  {
    id: "lezerv",
    visual: "escrow",
    name: "Lezerv",
    year: "2026",
    tags: ["Marketplace", "Web", "Android"],
    role: "Lead engineer",
    pitch: "Verified home services for Nigeria, where every contact and every naira goes through the platform.",
    summary:
      "Lezerv started as a booking and lead-gen site for home services in Lagos. The new version turns it into a managed two-sided marketplace: artisans apply, get verified and mark themselves available; clients find them, chat, get a quote and hire, and nobody swaps phone numbers, so the platform can stand behind every job. The website is live at lezerv.com, and a native Android app on the same backend is being prepared for its first Google Play release.",
    facts: [
      "Quotes are labelled estimate or firm, and only a recorded site visit can make one firm, so the label can't drift from reality",
      "A native Android app in Kotlin and Jetpack Compose, with MapLibre maps and live GPS, runs on the same Supabase backend as the website",
      "In-app chat over Supabase Realtime redacts phone numbers and emails, keeping the whole job on-platform",
      "Accepting a quote snapshots the agreed amount and the commission rate, the groundwork for Paystack escrow once production keys land",
      "Team alerts fire from database triggers, so they survive a closed tab; a failed send is recorded and retryable, never silent",
      "Rebook an artisan in two taps, live GPS pins on accepted jobs, Firebase push notifications",
    ],
    stack: ["React 19", "TypeScript", "Vite", "Kotlin", "Jetpack Compose", "MapLibre", "Supabase", "PostGIS", "Edge Functions", "Firebase", "Paystack", "AWS"],
    live: "https://lezerv.com",
    repo: "https://github.com/soma-connects/Lerzerv",
    shots: { desk: "assets/work/lezerv-desk.webp", phone: "assets/work/lezerv-phone.webp" },
    gallery: ["assets/work/lezerv-services.webp", "assets/work/lezerv-home-phone.webp", "assets/work/lezerv-phone.webp"],
    captureNote: "Latest main, run locally. The artisan cards are sample data fed to the page for the screenshot; the live directory is at lezerv.com.",
    caption: "request → site visit → firm quote → accepted (commission snapshot) → artisan paid",
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
    shots: { desk: "assets/work/efitmi-desk.webp", phone: "assets/work/efitmi-phone.webp" },
    gallery: ["assets/work/efitmi-phone.webp"],
    captureNote: "The capture guide, as the app shows it before the camera opens.",
    caption: "pose landmarks + ISO card reference → calibrated measurements",
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
    shots: { desk: "assets/work/voice-desk.webp", phone: "assets/work/voice-phone.webp" },
    gallery: ["assets/work/voice-phone.webp"],
    captureNote: "Lobby captured locally; the public-rooms list needs the live database, so it is cropped out.",
    caption: "voice in → pitch + transcript → points → power-ups on the roadmap",
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
    shots: { desk: "assets/work/nreclaim-desk.webp", phone: "assets/work/nreclaim-phone.webp" },
    gallery: ["assets/work/nreclaim-phone.webp"],
    captureNote: "Scan of the README's Devnet treasury; the RPC answer was simulated in the browser, the totals are the app's own maths.",
    caption: "scan treasury → verify (balance = 0 ∧ authority) → close → rent returned",
  },
];

/* --------------------------------------------------------------------------
   ARCHIVE: every repository with real code in it.
   cat:     space-separated filter categories (a repo can be in several)
   shot:    screenshot for the hover preview (else `snippet` shows as code)
   -------------------------------------------------------------------------- */
export const archive = [
  { name: "Ncliper", year: 2026, cat: "ai fullstack", label: "AI · Video", desc: "Game-API clip engine for streamers", stack: "Next.js · Python · Gemini · FFmpeg", url: "https://ncliper.vercel.app", featured: true, shot: "assets/work/ncliper-desk.webp" },
  { name: "Lezerv", year: 2026, cat: "fullstack fintech", label: "Marketplace", desc: "Managed home-services marketplace, web + native Android", stack: "React 19 · Kotlin · Supabase", url: "https://lezerv.com", featured: true, shot: "assets/work/lezerv-desk.webp" },
  { name: "EFitMi", year: 2026, cat: "ai", label: "Computer vision", desc: "Body measurements from one calibrated photo", stack: "Next.js · MediaPipe · TS", url: "https://github.com/soma-connects/EFitMi", featured: true, shot: "assets/work/efitmi-desk.webp" },
  { name: "Voice Party Arcade", year: 2026, cat: "realtime ai", label: "Realtime · Games", desc: "Voice-driven multiplayer party board game", stack: "Next.js · Firebase · WebRTC", url: "https://github.com/soma-connects/social-game", featured: true, shot: "assets/work/voice-desk.webp" },
  { name: "N-Reclaim", year: 2026, cat: "web3 fintech", label: "Web3 · Solana", desc: "Automated rent-reclaim bot for Kora operators", stack: "TS · Solana web3.js · Next.js", url: "https://github.com/soma-connects/N-Reclaim", featured: true, shot: "assets/work/nreclaim-desk.webp" },
  { name: "My Data Keep", year: 2026, cat: "fintech", label: "Client work", desc: "A live payments product built for a client", stack: "Client project", url: "https://mydatakeep.com" },
  { name: "AlphaScale", year: 2026, cat: "ai web3", label: "AI · Trading", desc: "Reputation-verified SMC/ICT trading clips via FairScale", stack: "Next.js · Gemini · Solana", url: "https://github.com/soma-connects/AlphaScale", snippet: "clips.filter(c => fairscale(c.author) >= 80)" },
  { name: "Solana Security Lab", year: 2026, cat: "security web3", label: "Security · Rust", desc: "5 Anchor programs, each shipped vulnerable and fixed", stack: "Rust · Anchor · TS tests", url: "https://github.com/soma-connects/solana-security-lab", snippet: "- AccountInfo<'info>   + Signer<'info>" },
  { name: "SecureHub Admin", year: 2026, cat: "fullstack", label: "Dashboard", desc: "Ops dashboard + API for a laundry service", stack: "React · Express · Supabase · Zod", url: "https://secure-hub-admin-dashboard.vercel.app", snippet: "router.get('/orders', auth, validate(q), list)" },
  { name: "Techrobotlab (EJ Blog)", year: 2026, cat: "fullstack", label: "Content", desc: "Nuxt robotics blog with a rich-text editor", stack: "Nuxt · Vue · TipTap · Pinia", url: null, snippet: "editor.chain().focus().setImage({ src }).run()" },
  { name: "Onelga Local Services", year: 2025, cat: "fullstack", label: "GovTech", desc: "Citizen services: ID letters, certificates, permits", stack: "React · Node · Flutter · AWS", url: "https://github.com/soma-connects/onelga-local-services", snippet: "POST /api/services/birth-certificate" },
  { name: "Techshop Secure API", year: 2025, cat: "security fullstack", label: "Security", desc: "Hardened auth service with a written threat model", stack: "Node · Express · Prisma · Argon2id", url: "https://github.com/soma-connects/Techshop", snippet: "rotateRefresh(token) // reuse ⇒ revoke family" },
  { name: "Tracking Security Service", year: 2025, cat: "security", label: "Python", desc: "Transport safety & tracking REST backend", stack: "Django · DRF · SimpleJWT", url: "https://github.com/soma-connects/tracking-security-service", snippet: "@ratelimit(key='ip', rate='10/m')" },
  { name: "ND-Project2", year: 2025, cat: "laravel fullstack", label: "Laravel", desc: "E-commerce storefront + admin: cart, orders, receipts", stack: "Laravel 12 · PHP 8 · Tailwind", url: "https://github.com/soma-connects/ND-Project2", snippet: "Order::with('items')->latest()->paginate()" },
  { name: "Hotel Web Service", year: 2025, cat: "laravel fullstack", label: "Laravel", desc: "Hotel booking: availability, reservations, staff portal", stack: "Laravel 12 · Jetstream · Alpine", url: null, snippet: "Room::available($checkIn, $checkOut)->get()" },
  { name: "This portfolio", year: 2026, cat: "fullstack", label: "Meta", desc: "Hand-built, zero dependencies", stack: "HTML · CSS · JS · Canvas", url: "https://github.com/soma-connects/Portfolio-", snippet: "import { featured } from './data.js'" },
];

/* Six repos exist but are still empty, so we count them without listing them. */
export const incubating = 6;

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
   THE STACK, BY LAYER: `uses` names the projects that prove each layer.
   -------------------------------------------------------------------------- */
export const layers = [
  {
    name: "Interface",
    note: "What people touch",
    tools: ["Next.js 15", "React 19", "Vue / Nuxt", "TypeScript", "Kotlin + Compose", "Tailwind", "Framer Motion", "Canvas API"],
    uses: ["Ncliper", "Lezerv", "EFitMi", "Voice Party Arcade", "SecureHub Admin"],
  },
  {
    name: "Logic",
    note: "Where the rules live",
    tools: ["Laravel", "PHP 8", "Node / Express", "FastAPI", "Django REST", "Server Actions", "Zod"],
    uses: ["Lezerv", "ND-Project2", "Hotel Web Service", "Techshop Secure API", "Tracking Security Service"],
  },
  {
    name: "Data",
    note: "What must never drift",
    tools: ["PostgreSQL", "Supabase", "PostGIS", "MySQL", "pgvector", "Prisma", "Redis", "Firestore"],
    uses: ["Lezerv", "Ncliper", "Voice Party Arcade", "ND-Project2"],
  },
  {
    name: "Intelligence",
    note: "Seeing, hearing, judging",
    tools: ["Gemini", "MediaPipe Pose", "FFmpeg", "yt-dlp", "Speech-to-Text", "Pitch detection", "Modal GPU"],
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
    tools: ["Vercel", "AWS", "Docker", "Cloud Run", "Google Play", "GitHub Actions", "Jest / Vitest", "Playwright"],
    uses: ["Ncliper", "Lezerv", "Voice Party Arcade", "Techshop Secure API"],
  },
];

/* --------------------------------------------------------------------------
   JOURNEY: from your CV, newest first.
   -------------------------------------------------------------------------- */
export const journey = [
  {
    when: "2026",
    title: "Shipping in public",
    where: "Independent",
    text: "Grew Lezerv from a booking site into a managed marketplace with a native Android app, shipped a live payments product for a client, entered N-Reclaim in the Superteam Nigeria bounty, wrote a Solana security lab in Rust, and shipped EFitMi and Voice Party Arcade.",
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
  "TypeScript", "Kotlin", "Laravel", "Next.js", "Python", "Rust", "Solana", "Gemini",
  "PostgreSQL", "FFmpeg", "MediaPipe", "Supabase", "WebRTC", "Paystack", "Docker", "Jetpack Compose",
];
