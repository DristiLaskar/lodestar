import { useCallback, useEffect, useRef } from 'react';
import { streamNdjson } from '../lib/api';
import { ApiError, describeError } from '../lib/errors';
import { createNdjsonParser } from '../lib/ndjson';
import { extractJson, ingest, wholeToLines } from '../lib/schema';
import { toModelTrip } from '../lib/trip';

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * Runs one generation (plan or refine) and feeds validated lines into the reducer.
 *
 * Stale-response protection: every run gets an id. Starting a new run (or
 * cancelling) bumps the id, aborts the old request, and every callback checks
 * `alive()` before it touches state, so a slow old response can never
 * overwrite a newer one.
 */
export function useGenerate({ stateRef, dispatch, chaos }) {
  const runRef = useRef(0);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const cancel = useCallback(() => {
    runRef.current += 1;
    abortRef.current?.abort();
    dispatch({ type: 'RUN_CANCEL' });
  }, [dispatch]);

  const start = useCallback(
    async (mode, text) => {
      const prev = stateRef.current;
      if (mode === 'refine' && !prev.trip) return;

      abortRef.current?.abort();
      const runId = ++runRef.current;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const alive = () => runRef.current === runId;

      dispatch({ type: 'RUN_START', mode, prompt: mode === 'plan' ? text : prev.prompt, sessionId: mode === 'plan' ? newId() : prev.sessionId });

      const ctx = { day: 1 };
      let stops = 0;
      let ops = 0;
      let sawDone = false;
      let errLine = null;

      const handle = (obj) => {
        if (!alive()) return;
        const r = ingest(obj, ctx);
        switch (r.kind) {
          case 'trip': if (mode === 'plan') dispatch({ type: 'LINE_TRIP', meta: r.data }); break;
          case 'day': if (mode === 'plan') { ctx.day = r.data.day; dispatch({ type: 'LINE_DAY', ...r.data }); } break;
          case 'stop': if (mode === 'plan') { stops += 1; ctx.day = r.data.day; dispatch({ type: 'LINE_STOP', stop: r.data }); } break;
          case 'budget': case 'checklist': case 'tip': if (mode === 'plan') dispatch({ type: 'LINE_BLOCK', block: r.kind, data: r.data }); break;
          case 'op': if (mode === 'refine') { ops += 1; dispatch({ type: 'LINE_OP', op: r.data }); } break;
          case 'note': dispatch({ type: 'LINE_NOTE', text: r.data }); break;
          case 'error': errLine = r.data; break;
          case 'done': sawDone = true; break;
          default: dispatch({ type: 'SKIPPED', n: 1 });
        }
      };

      const parser = createNdjsonParser({
        onObject: handle,
        onBad: () => alive() && dispatch({ type: 'SKIPPED', n: 1 }),
      });

      try {
        await streamNdjson({
          url: mode === 'plan' ? '/api/plan' : '/api/refine',
          body: mode === 'plan' ? { prompt: text } : { instruction: text, trip: toModelTrip(prev.trip) },
          signal: ctrl.signal,
          chaos,
          onChunk: (t) => alive() && parser.push(t),
        });
        if (!alive()) return;
        parser.flush();

        if (errLine) throw new ApiError(errLine.code === 'not_a_trip' ? 'unclear' : errLine.code || 'server', errLine.message);

        if (mode === 'plan' && stops === 0) {
          // Not NDJSON? Maybe one big object in some other shape. Try to recover it.
          const raw = parser.raw();
          const lines = wholeToLines(extractJson(raw));
          lines.forEach(handle);
          if (stops === 0) {
            const details = raw.trim().slice(0, 500);
            throw new ApiError(raw.includes('{') ? 'malformed' : raw.trim() ? 'unclear' : 'empty', raw.trim() && !raw.includes('{') ? raw.trim().slice(0, 200) : '', { details });
          }
          // Recovered: the lines the streaming pass could not read were the pretty-printed
          // object itself, so they are not "skipped data".
          dispatch({ type: 'RESET_SKIPPED' });
          dispatch({ type: 'RUN_DONE', truncated: false });
          return;
        }

        dispatch({ type: 'RUN_DONE', truncated: mode === 'plan' && !sawDone });
      } catch (e) {
        if (!alive()) return; // cancelled or superseded: stay silent
        dispatch({ type: 'RUN_FAIL', error: describeError(e) });
      }
    },
    [dispatch, stateRef, chaos],
  );

  return { start, cancel };
}
