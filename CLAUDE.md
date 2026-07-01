# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Greenfield — no code exists yet.** The repository currently contains only the spec
(`PRD.md`) and a sequenced backlog (`ISSUES/`). The source files described below
(`index.html`, `app.js`, `logic.js`, `data.json`, etc.) are to be **created** while working
through the issues; treat the PRD and issues as the source of truth until they exist.

> Note: the parent `D:\claude\CLAUDE.md` documents unrelated sibling projects (Game Physics
> Lab, Lightning Position, etc.) and does **not** apply here. This file governs `Travel Japan`.

`PRD.md` and all `ISSUES/*.md` are written in **Thai**, as is the product UI.

## What this is

An interactive single-page static site recommending Japan travel spots (sightseeing / games /
cosplay / electronics / food) for Thai tourists: a card grid synced with a Leaflet map, prices
shown in both ¥ and ฿, bookmarks, filter/search/sort, and a detail modal with image gallery.

## Build sequence

Work the issues in `ISSUES/` in order. **Issue 01 is the walking skeleton** that scaffolds every
file and cuts through all layers (data → pure logic → rendered grid); issues 02–08 each depend
only on 01 and add one slice (currency, filter/search/sort, map, modal, bookmarks, full dataset,
polish). Recommended implementation order within a slice: research → `data.json` → `logic.js` +
tests → `app.js`/UI → README.

## Commands

There is **no build step** for the site itself. Tooling is dev-only.

```bash
# Serve locally — REQUIRED, do not open via file:// (see below)
python -m http.server        # then open http://localhost:8000

# Tests (Vitest, added as a dev dependency in issue 01)
npm install
npm test
npx vitest run logic.test.js          # single file
npx vitest run -t "convertJpyToThb"   # single test by name
```

### ⚠️ Must run through a local web server
`app.js` uses `fetch('data.json')`, which fails under the `file://` protocol (CORS). Always serve
over HTTP (`python -m http.server` or VS Code Live Server). This is a deliberate exception to the
"just double-click the HTML" convention, traded for the multi-file + `data.json` structure.

## Architecture

Multi-file static ES-module app, no bundler. CSS and JS are in their own files (not inlined).

- `index.html` — page shell, loads Leaflet from CDN, `<script type="module" src="app.js">`
- `app.js` — **side-effect layer**: orchestration, DOM rendering, Leaflet, `fetch`, localStorage
- `logic.js` — **pure-function layer**: the single test seam. No DOM / network / Leaflet.
- `data.json` — the dataset (entries embedded from research)
- `package.json` — Vitest only. The live site's only CDN deps are Leaflet and Google Fonts
  (Kanit + Noto Sans Thai); no bundler or runtime JS deps.

The core boundary: **`logic.js` holds all pure logic and is the only thing tested.** `app.js`
imports it, calls it, and renders the result; the side-effect layer is not unit-tested directly.
Pure functions: `getStartingPriceJpy(entry)`, `getPriceLevel(jpy)`, `filterEntries(entries, criteria)`,
`sortByPrice(entries, direction)`, `convertJpyToThb(jpy, rate)`, `searchMatches` (now also matches `tags`),
`validateEntry(entry)` → `string[]` (quality/DoD guard; empty = passes) and `validateDataset(entries)`
→ `string[]` (runs `validateEntry` per entry + flags duplicate `id`s). Closed sets are exported as
`CATEGORIES` / `CITIES`. Tests live in `logic.test.js`, grouped with `describe` per function — one test
file per logic module. A **dataset guard test** imports `data.json` and asserts `validateDataset` returns
zero errors, so a malformed/thin entry turns `npm test` red before it ships.

> Domain terms are defined in `CONTEXT.md`; significant decisions live in `docs/adr/`.

### Data model — the unit is an "entry" (a shop/place)
Each entry in `data.json`: `id`, `nameTh`, `nameJa`, `nameRomaji`, `category`
(`sightseeing | food | games | cosplay | electronics | anime-goods | cafe | shopping` — 8 categories),
`city` (`tokyo | osaka | kyoto`), `description` (Thai), `lat`/`lng`, `address`,
`images[]` (each with `url` + `source`/`credit`/`license`, plus optional `isIllustrative` boolean —
`true` marks a context/illustrative image that is **not** an actual photo of the place; the UI shows an
"ภาพประกอบ" badge on the card and in the modal gallery. See `docs/adr/0003`),
`products[]` (each `nameTh`, `priceJpy`, optional `condition` `new`/`used`), and `sourceUrl`.
Optional enrichment fields: `hours`, `station` (access), `tags[]`, `tips[]`, `bestTime`,
`googleMapsUrl`, `editorsPick` (boolean) + `editorsPickReason`. **Prices are always stored as JPY**;
THB and `priceLevel` (¥/¥¥/¥¥¥) are computed at runtime. `editorsPick` entries appear in the
Featured strip. New categories may be empty in the dataset and show a "coming soon" empty-state.

### Currency — store JPY, compute THB live with a fallback
On load, `fetch` a keyless JPY→THB rate and compute baht via `convertJpyToThb(jpy, rate)`. Show
both `¥` and `฿`, plus a "rate as of …" label. **If the fetch fails, fall back to a hard-coded
approximate rate** (noted as such) — the page must never break.

### Map — Leaflet + OpenStreetMap
Leaflet loads from CDN (no API key). Pin every entry that passes the current filter; the map stays
**synced to the active filter/search** (re-render pins when the view model changes). Each pin's
popup shows name + image + starting price + an open-modal button.

## Conventions & scope

- **Thai-first UI**, with Japanese/romaji names alongside. Keep new copy in Thai to match the PRD.
- Data is edited directly in `data.json` — there is no CMS, backend, or in-UI editing.
- **Test only `logic.js`'s external behavior** (input → output). No DOM/Leaflet/fetch/E2E tests.
- Scope is growing toward ~50 entries across 8 categories (see `docs/adr/0002`); still no
  hosting/deploy and no multi-language UI. Build in phases: design first, then data expansion.
- Images come from Wikimedia Commons **or other free sources** (e.g. Unsplash/Pexels) — always
  store `source`/`credit`/`license` and give credit; never hotlink copyrighted images. Per-entry
  image preference order: (1) a real free photo → (2) a free **illustrative** image flagged
  `isIllustrative: true` → (3) the polite per-category emoji placeholder (last-resort fallback).
  An illustrative image still needs full `source`/`credit`/`license`; the flag only drives the
  "ภาพประกอบ" badge so users are never misled. Prices/hours are approximate and labeled as such.
  See `docs/adr/0001` (sourcing) and `docs/adr/0003` (illustrative images).
- **No invented ratings.** Don't fabricate star ratings/review counts; link to Google Maps instead.
