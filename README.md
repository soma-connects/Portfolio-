# SIGNAL: Paulji Peters' portfolio

> Full-stack engineer turning *noise* into **signal**.

A hand-built portfolio with **zero frameworks and zero dependencies**: just HTML, CSS and modern JavaScript.
Every project on it is explained by a **live diagram drawn in code**, built from what the real repositories do.

![Share card](assets/og.png)

---

## The idea

Every project in this GitHub account finds a signal hidden in noise:

| Project | The noise | The signal |
|---|---|---|
| Ncliper | a 4-hour stream | the 60 seconds worth posting |
| EFitMi | a phone photo | your measurements in centimetres |
| N-Reclaim | thousands of token accounts | the zombie ones holding your SOL |
| My Data Keep | a customer's purchase history | exactly how much credit is safe |
| Final-year project | a moving hand | play / pause / rewind |

So the whole site is built on that idea. The hero turns static into your name, and your cursor adds noise back in.

## Try to break it: the Lab

The `#lab` section is a working model of My Data Keep's **Safe Margin Rule** ([`js/lab.js`](js/lab.js)):

- Every amount is an **integer number of kobo**. Floats are never used, not even to format ₦ values.
- The reserve is **derived, never stored**: `max(0, floor(lifetime × tier% / 100) − debt)`, the same maths as the SQL view.
- **Fire 5 at once** sends five borrows that really interleave on the event loop. With the lock **on**, a per-user async mutex
  serialises them, like `pg_advisory_xact_lock(user_id)`. Switch it **off** and you can watch the race lend money that was never earned.

## Ask Signal AI (real Gemini, grounded)

In the ⌘K palette, any question (or Enter on an "Ask" preset) is sent to [`api/ask.js`](api/ask.js), a Vercel serverless function:

- The model's **only** knowledge is `js/data.js`, split into fact blocks with ids. Answers must cite those ids,
  and the UI turns each cited id into a button (e.g. "Inspect My Data Keep X-Ray").
- If the facts don't cover a question, the model returns `grounded: false` and **says so instead of guessing**.
- It uses no dependencies (just the built-in `fetch`), and it has an input cap, a per-IP rate limit and a JSON response schema.
- **Offline fallback:** when `/api/ask` isn't there (e.g. `python -m http.server`), the palette uses the instant keyword answers instead.

**Setup:** Vercel → Project → Settings → Environment Variables → add `GEMINI_API_KEY`
(get one at https://aistudio.google.com/apikey). Optional: `GEMINI_MODEL` (default `gemini-2.5-flash`). Redeploy.
To test the function locally, run `npx vercel dev`.

## Run it locally

ES modules (`import … from`) don't load from `file://` (browsers block them for security), so serve the folder:

```bash
python3 -m http.server 8080      # or: npx serve .
# open http://localhost:8080
```

## Update the content

**All text lives in [`js/data.js`](js/data.js).** Add a project, change a date or fix a stat there.
You never need to touch the HTML for content changes.

- `featured`: the six big project chapters. `visual` picks the animated diagram in `visuals.js`.
- `archive`: every repo row. `cat` can hold several filter categories (`"ai web3"`).
- `layers`, `journey`, `stats`, `marquee`: the other sections.

## File map (and what each one teaches)

| File | What it does | Technique worth learning |
|---|---|---|
| `index.html` | Page skeleton + static sections | Semantic HTML, `sr-only` text for screen readers, JSON-LD for Google |
| `css/style.css` | All styling | Design tokens, **`@property`** to animate CSS variables (the cream "scene change"), `clamp()` fluid type |
| `css/fonts.css` | Self-hosted fonts | `unicode-range` subsetting: the browser downloads only what the page uses |
| `js/main.js` | Boot order + preloader | `async/await` sequencing, `document.fonts.load` |
| `js/data.js` | Content | Separating content from presentation |
| `js/render.js` | Data → HTML | Template literals, escaping (`esc()`) to avoid XSS |
| `js/hero.js` | Particle name | Sampling text pixels with `getImageData`, springs + flow fields, batching canvas draws |
| `js/visuals.js` | Six live diagrams | Pure functions of time `draw(t)`, easing, Bézier curves, pausing off-screen work |
| `js/portrait.js` | Halftone portrait + lens | Luminance, gamma correction, canvas clipping |
| `js/motion.js` | Scroll + pointer effects | `IntersectionObserver`, one `requestAnimationFrame` loop, read-then-write to avoid layout thrashing, lerp |
| `js/lab.js` | Safe Margin simulator | Integer money, derived state, an async mutex that models an advisory lock, real race conditions |
| `js/system.js` | X-Ray drawer, ⌘K palette, telemetry HUD | Grounded AI client with stale-response cancelling, caching and offline fallback |
| `api/ask.js` | Signal AI endpoint (Vercel) | Retrieval-by-construction, JSON schema output, cited sources, refusing to guess, rate limiting |

## Built-in care

- **Reduced motion:** if your OS asks for less motion, every animation freezes on a meaningful final frame.
- **No-JS fallback:** content is never hidden unless JavaScript is running (`.js` class trick in `<head>`).
- **Performance:** canvases only animate while on screen, device pixel ratio is capped at 2, particle count adapts to screen size, fonts are preloaded and self-hosted.
- **Keyboard + screen readers:** skip link, visible focus rings, labelled canvases, real `<img>` behind the halftone.

## Easter eggs

- Open the browser console.
- Type the Konami code on the page: `↑ ↑ ↓ ↓ ← → ← → B A`.

## Deploy

**Vercel:** import the repo → Framework preset **Other** → no build command → deploy.
**GitHub Pages:** Settings → Pages → deploy from branch → `/ (root)`.

After deploying, change `og:image` in `index.html` to the full URL (e.g. `https://your-site.com/assets/og.png`), because LinkedIn and X need an absolute link to show the share card.

---

Data sources: the GitHub repos under [`soma-connects`](https://github.com/soma-connects) and Paulji's CV.
"250K+ lines" counts TS/JS/Vue/PHP/Python/Rust/SQL/CSS across all repos, excluding dependencies, lockfiles and build output.
