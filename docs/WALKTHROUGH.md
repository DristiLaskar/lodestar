# Walkthrough: explaining Lodestar in the interview

You will demo it, walk through code, review an AI-generated snippet, fix a bug someone introduces, and add a small feature. Read this once, then open the files and trace each flow yourself.

## The one-minute pitch

"It is a trip planner, but the model never chats. The server asks for NDJSON, one JSON object per line. The browser parses each line as it arrives, validates and repairs it, and feeds it into a reducer, so stops stream into the UI. Anything unusable is skipped instead of crashing. The map is an SVG disc where every stop is a star."

## Follow one request through the code

1. `Composer.jsx` → `App.jsx` `plan()` → `useGenerate.start('plan', text)`.
2. `useGenerate` bumps a **run id**, aborts the previous request, dispatches `RUN_START`.
3. `lib/api.js` `streamNdjson` POSTs to `/api/plan` and reads the body chunk by chunk. A timer aborts it if no bytes arrive (the **watchdog**).
4. `server/index.js` validates the body, builds messages (`server/prompts.js`), and streams from `server/llm.js`, which reads the provider's SSE and yields text deltas. Headers are sent only when the first chunk exists, so early failures are real HTTP errors; later ones become a final `{"type":"error"}` line.
5. Each chunk goes to `lib/ndjson.js`, which buffers partial lines, ignores prose and fences, repairs small damage, and calls `onObject` or `onBad`.
6. `lib/schema.js` `ingest()` turns an object into `{kind, data}`: trip, day, stop, budget, checklist, tip, note, error, done, or `skip`.
7. `useGenerate` dispatches typed actions; `state/tripReducer.js` builds the trip. First stop flips `loading` to `streaming`.
8. When the stream ends: error line → error; zero stops → try the whole-object fallback; else `RUN_DONE` (with `truncated` if no `done` line).

## Decisions worth being able to defend

- **NDJSON over one object**: streaming plus isolation of damage.
- **Validate everything in `schema.js`**: the model is untrusted input. Normalisers accept common drift and return `null` for the unusable.
- **Run id for stale responses**: `runRef` increments on every start/cancel; every callback checks `alive()`. Aborting alone is not enough, because a chunk can already be in flight.
- **Refine as operations, not regeneration**: small output, keeps manual edits, easy to validate (`lib/ops.js`), all-or-nothing with a snapshot for undo.
- **Reducer for the itinerary**: many transitions (stream, edit, undo, fail) touching one structure; keeps them testable (`ops.test.js`).
- **Proxy server**: key stays server-side; validation, rate limit, one place to swap providers.
- **OpenAI-compatible client**: one `fetch` covers Groq, Gemini, OpenRouter, OpenAI, Ollama. No SDK, so there is nothing hidden to explain.
- **framer-motion `Reorder`**: handles pointer and touch drag with layout animation; keyboard and button reorder are separate (`NUDGE`) for accessibility.
- **SkyDisc projection**: fit all stops once (`lib/geo.js`) so stars do not move when you change day; longitude is scaled by cos(latitude).

## Likely questions

- *What if the model returns valid JSON in the wrong shape?* `wholeToLines` in `schema.js`.
- *What if two requests overlap?* Run id plus abort (`useGenerate`).
- *Why not `response_format: json_object`?* It forces a single object, which loses streaming and isolation. Trade-off: weaker guarantees, so we validate.
- *Where would you add retries?* In `useGenerate`'s catch, for `retryable` codes, with backoff; the UI currently asks the user.
- *How would you test it?* Parser and schema as pure unit tests; reducer for transitions; UI smoke tests with a mocked streaming `fetch` (`app.test.jsx`).

## Practice: bugs to find and features to add

Try breaking these on purpose, then fix them:
- Remove the `alive()` check in `handle` and watch the stale-response test fail.
- Change `NUDGE` to use `j = i + dir + 1`.
- Make `parseTime` ignore `pm`.

Small features to practise adding:
- Show total trip duration in the header (`tripStats` in `lib/trip.js`).
- A "Duplicate stop" button (new reducer action).
- Persist checklist ticks (move state from `Extras.jsx` into the trip).
- Retry automatically once on `stalled` (`useGenerate`).
