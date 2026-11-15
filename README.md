# Lodestar

Describe a trip in your own words. Lodestar asks an LLM for a structured itinerary, validates it, and turns it into an interactive **star map**: every stop is a star on a planisphere disc, each day is a route you can reorder, trim and refine.

> Frontend internship assignment, option: **Trip planner**. Not a chatbot: the model never talks to the user. It returns NDJSON that the app parses, validates and renders as components.

## Run it

Requires Node 18.18+ (20 or 22 recommended).

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# put your API key in .env  (see "Pick a provider" below)
npm start                   # API on :8787, UI on http://localhost:5173
```

No key yet? Run with canned demo data to explore the UI: set `AI_MOCK=true` in `.env`.

| Script | What it does |
| --- | --- |
| `npm start` | API server and Vite dev server together |
| `npm test` | Unit tests plus UI smoke tests (Vitest) |
| `npm run build` | Production build into `dist/` |
| `npm run serve` | Serve `dist/` and the API from one Node process (deploy this) |

### Pick a provider

Everything speaks the OpenAI-compatible `/chat/completions` protocol, so switching is one line in `.env`.

| `AI_PROVIDER` | Free tier? | Where to get a key |
| --- | --- | --- |
| `groq` (default) | yes | console.groq.com |
| `gemini` | yes | aistudio.google.com |
| `openrouter` | some `:free` models | openrouter.ai |
| `openai` | no (cheap) | platform.openai.com |
| `ollama` | local, free, no key | ollama.com |

Model names change over time. If a provider answers "model not found", set `AI_MODEL` to a current one from its model list. The server prints the active provider and model on start.

## How it works

```
Browser (React)                         Express server                    LLM provider
─────────────────                       ──────────────                    ────────────
Composer ──POST /api/plan──────────────▶ validate input, rate limit
                                         build prompt ───────────────────▶ stream tokens
 streamNdjson ◀── NDJSON text stream ◀── forward deltas as they arrive ◀──
   │ watchdog: abort if silent
   ▼
 ndjson parser  (line buffering, fences, glued objects, repairs)
   ▼
 schema.ingest  (coerce, clamp, alias, or skip each object)
   ▼
 tripReducer    (stops appear one by one) ──▶ DayView / StopRow / SkyDisc
```

**Why NDJSON and not one JSON object?** One object is all-or-nothing: a single stray comma loses the whole trip, and nothing renders until the end. With one JSON object per line, stops stream into the UI as they are written, and a broken line costs one stop, not the itinerary.

**The API key never reaches the browser.** The browser only talks to `/api/*`. The server holds the key, validates input (length, shape), rate-limits, and talks to the provider.

### Handling bad AI output

| What goes wrong | What happens |
| --- | --- |
| JSON slightly broken (trailing comma, bare keys, smart quotes, `None`) | Repaired, then parsed |
| A line is unrecoverably broken | Skipped and counted; banner says "N items skipped"; the rest is kept |
| Wrong field types (`"9am"`, `"1.5 hours"`, `"¥1,200"`, `"34.9"`) | Coerced by `schema.js` |
| Out-of-range values (lat 999, duration -20) | Dropped or clamped; stop is kept |
| Stop with no title | Skipped |
| Prose or code fences around the JSON | Ignored |
| One big object in a different shape | Fallback finds `days/itinerary/activities…` and converts it |
| Only prose, or nothing | Error screen with a specific message, retry and edit |
| Stream ends early | Keeps finished stops, banner offers retry |
| Model goes silent mid-stream | 20 s watchdog aborts; partial trip kept, banner offers retry |
| Slow to start | After 12 s the loading screen says so and offers Cancel |
| Provider error, bad key, rate limit, server down | Distinct messages that say what to do |
| New request while an old one is running | Old request is aborted and its late data is ignored (run-id check) |
| Refine fails halfway | Itinerary is restored exactly as it was |
| Corrupted saved trip in localStorage | Sanitised on load, or removed if unusable |

### The failure lab

Run `npm start`, click the flask icon in the top bar, pick a mode (broken JSON, wrong shape, cut off, stalls, refusal, provider outage, and more), then chart a trip. The server fabricates that exact misbehaviour. It works without an API key and is disabled in production builds (visible there only with `?lab`). Tests cover the same cases.

## Features

**Required:** free-form input, real LLM through a backend, structured output rendered as stateful UI (expand, remove with undo, reorder by drag, keyboard, or buttons, move between days), loading / error / empty states, mobile layout, failure handling above.

**Stretch (all included):**
- Different block types from the model: stops, budget (donut chart), checklist (interactive, with progress), tips
- Streaming: stops appear as they are generated
- Refinement loop: follow-ups return edit *operations* (add, remove, update, move) that are validated and applied to the existing trip, so your manual edits survive. One click to undo.
- Save and reload: trips auto-save to a logbook in `localStorage`
- Dark and light themes, motion that respects `prefers-reduced-motion`, full keyboard navigation (press `?`)

## Project layout

```
server/            Express proxy: provider presets, SSE→NDJSON streaming, prompts, limiter, failure lab
src/lib/           schema (validation), ndjson (parser), ops (refine edits), trip (model), geo, api, storage
src/state/         tripReducer: one reducer owns the itinerary
src/hooks/         useGenerate (runs + stale-run protection), useTheme, useLogbook
src/components/    SkyDisc (star map), StopRow, DayView, RefineBar, …
src/test/          Vitest suites
docs/WALKTHROUGH.md   how to explain every decision in the interview
```

## AI usage note

> **Edit this section so it is accurate for you.** The assignment rewards honesty here, and you will be asked to explain any part of the code in the interview.

- The initial implementation (architecture, code, styling, tests) was generated with Claude (Anthropic) from a detailed brief.
- Inside the app, the LLM is used for one job: turning a trip description into NDJSON itinerary lines, and turning a change request into edit operations. Prompts are in `server/prompts.js`.
- _What I did myself / changed / verified:_ TODO

## Known limitations

- Coordinates come from the model and can be wrong; stops without valid coordinates appear in the list but not on the map.
- Distances between stops are straight-line × 1.3, not real routing.
- Checklist ticks are not saved with the trip.
- Refinement sends the model a compact view of the trip (titles, times, areas), not descriptions.
- The rate limiter is in-memory and per process; fine for a demo, not for scale. No authentication.
- Fonts load from Google Fonts, so first load needs internet (system fonts are the fallback).
- Free-tier models are less consistent at structured output; that is exactly what the repair and skip logic is for.

## Time spent

TODO: fill in your real number (the brief asks for about 8 hours).

## What I would do next

Real routing for travel times, drag between days, share link for a trip, persisting checklist ticks, provider fallback when one rate-limits, and end-to-end browser tests.
