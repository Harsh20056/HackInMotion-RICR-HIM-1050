# Performance

Phase 1.5 reported writing this file but never did, so there was no committed
baseline to regress against. This establishes one from measurement, not memory.

**How everything here was measured**

- Build: `npm run build` in `frontend/` (Vite 8, rolldown).
- Chunk sizes: Vite's own build report (gzip column) and
  `npx vite-bundle-visualizer`.
- Lighthouse: `npx lighthouse` v13.4.1, mobile form factor, simulated
  throttling, **4x CPU slowdown**, **Slow 4G** (150 ms RTT, 1638.4 Kbps),
  headless Chrome, against the **production build** served by `vite preview`.
- Waterfall / request counts: `performance.getEntriesByType('resource')` in the
  page itself, so the numbers are what the browser actually fetched.
- `/dashboard` is behind auth, so Lighthouse cannot score it directly. Its
  numbers below come from the in-page resource timing with a real citizen
  session (`citizen1@samadhan.gov.in`).

Sizes are **gzip over the wire** unless stated otherwise. `vite preview`
already gzips responses; it does **not** serve brotli.

---

## Phase 4.7 — Before

Measured 2026-08-13 against commit `bfafee4`.

### Budget

| Metric | Target | Landing `/` | Dashboard `/dashboard` |
|---|---|---|---|
| Initial JS (gz) | < 180 KB | **144 KB** ✅ | **287 KB** ❌ |
| Largest route chunk (gz) | < 150 KB | **119.6 KB** ✅ | same ✅ |
| Lighthouse Performance | ≥ 85 | **88** ✅ | not scorable (auth) |
| First Contentful Paint | < 2.5 s | **2.7 s** ❌ | not scorable (auth) |
| Time to Interactive | < 5 s | **3.0 s** ✅ | not scorable (auth) |
| Lighthouse SEO | ≥ 95 | **100** ✅ | n/a (noindex) |

`/transparency`: Performance **88**, SEO **100**, FCP **2.8 s**, TTI **3.0 s**.

### Largest chunks (gzip)

| Chunk | Raw | Gzip | Loaded on |
|---|---|---|---|
| `DashboardPage` | 450.8 KB | **119.6 KB** | `/dashboard` |
| `pdf` | 421.2 KB | 125.4 KB | Documents only (lazy) ✅ |
| `index` (entry) | 235.0 KB | **73.9 KB** | every route |
| `leaflet` | 148.8 KB | 43.4 KB | map / report only (lazy) ✅ |
| `react-dom` | 132.7 KB | 43.1 KB | every route |
| `types` | 56.4 KB | 12.9 KB | every route |
| `createLucideIcon` | 38.2 KB | 12.6 KB | every route |
| `index.css` | 76.0 KB | 13.3 KB | every route |

### What regressed, and why

Route-level lazy loading **mostly still holds**. Verified by grepping the built
chunks rather than the source:

- `leaflet` — **not** in the entry chunk. The two matches in `index.js` are
  preload manifest strings, not the library. ✅
- `pdfjs` — own chunk, Documents route only. ✅
- `recharts` — **83 references inside `DashboardPage`**. ❌

`DashboardPage.tsx` statically imports `AnalyticsPanel` (line 56), which imports
recharts. Two more Phase 3/4 surfaces are also static imports on the same page:
`ResolutionReviewPanel` (line 60) and `CoordinationPanel` (line 61) — the latter
is staff-only and lives inside a modal, so a citizen downloads it and never
sees it. That is what pushed the citizen dashboard's initial JS to 287 KB gz,
60% over budget.

### Request waterfall — `/dashboard`, first load, authenticated citizen

**43 API requests** before the page settles. Nearly all are cross-origin
(`:8080` → `:4000`), so each non-simple GET also pays a CORS `OPTIONS`
preflight — roughly **83 round trips** in total.

| Endpoint | Calls | Note |
|---|---|---|
| `/issues/:id/verification` | **20** | N+1 — one per issue card |
| `/analytics/overview` | **4** | same response fetched 4x |
| `/analytics/departments` | **4** | same response fetched 4x |
| `/analytics/hotspots` | **4** | same response fetched 4x |
| `/analytics/trends` | **4** | same response fetched 4x |
| `/issues` | 2 | duplicated |
| `/users/me/supports` | 2 | duplicated |
| `/auth/me` | 1 | |
| `/notifications/unread-count` | 1 | |
| `/users/me/stats` | 1 | |

Assets on the same load: 37 requests, 287 KB JS + 13 KB CSS.

`/` (landing, logged out): 14 JS requests, 144 KB JS, 13 KB CSS, **0 API calls**.

### Compression

| | Status |
|---|---|
| gzip | ✅ served by `vite preview` (`Content-Encoding: gzip`) |
| brotli | ❌ not served even when the client sends `Accept-Encoding: br` |
| precompressed artifacts at build | ❌ none emitted |

A `curl -I` (HEAD) shows no `Content-Encoding` and is misleading here — the
compression middleware only kicks in on GET. Always verify with a GET.

### Images — the brief's hypothesis did not survive measurement

The brief expected images to be the biggest 3G win. They are not, in this
dataset:

- **200 of 202** `issue_media` rows point at small local seed files
  (`/water.webp`, `/electricity.webp`, …). Only **2** are Cloudinary-hosted.
- Those local files are already WebP and small: 10.8 – 35.8 KB each, **125 KB
  for the entire `public/` folder**.
- The dashboard's first paint fetched **0** image bytes — cards render before
  any photo is requested.

So there is no 50 KB-per-thumbnail problem to fix in the seeded data. The
Cloudinary transformation helper is still worth adding, because real user
uploads *do* go to Cloudinary (`issueRepository.ts:163`) and today nothing
constrains their dimensions — but it is a correctness fix for production
uploads, not the measured win. The measured win is JS and round trips.

### Ranked by expected impact on Slow 4G

1. **Dashboard initial JS, 287 KB gz** — recharts on the citizen critical path.
2. **~83 round trips** — 20x N+1 plus 4x-duplicated analytics, each with a
   preflight. On 150 ms RTT this dominates wall-clock even though the payloads
   are small.
3. **No brotli** — ~15–20% off every text asset, free.
4. FCP 2.7 s on a route that fetches no data at all — entry chunk cost.
