import { applyOp } from '../lib/ops';
import { emptyTrip, upsertDay, setStops, countStops } from '../lib/trip';
import { MAX_DAYS } from '../lib/schema';

// status: idle → loading (nothing yet) → streaming (stops arriving) → ready
//         ↘ error (nothing usable)        refine: ready → refining → ready
export const initialState = {
  status: 'idle',
  mode: null, // 'plan' | 'refine' (the run in flight)
  prompt: '',
  sessionId: null,
  trip: null,
  seq: 0, // stop id counter: ids are s1, s2, … and never reused
  error: null, // full-screen failure (nothing to show)
  banner: null, // inline failure/notice on top of whatever we do have
  skipped: 0, // lines or ops the model sent that we had to drop
  truncated: false,
  snapshot: null, // trip before a refine run, for Undo
  applied: 0,
  note: null,
  removed: null, // last removed stop, for Undo
  pulse: [], // stop ids to flash after a refine
};

const withTrip = (state, trip, extra = {}) => ({ ...state, trip, ...extra });
const dayOf = (trip, day) => trip.days.find((d) => d.day === day);

export function reducer(state, a) {
  switch (a.type) {
    case 'RUN_START':
      if (a.mode === 'plan') {
        return { ...initialState, status: 'loading', mode: 'plan', prompt: a.prompt, sessionId: a.sessionId, trip: emptyTrip() };
      }
      return { ...state, status: 'refining', mode: 'refine', banner: null, note: null, skipped: 0, applied: 0, snapshot: state.trip, removed: null, pulse: [] };

    // ── plan stream ──
    case 'LINE_TRIP':
      return withTrip(state, { ...state.trip, meta: a.meta });
    case 'LINE_DAY':
      return withTrip(state, { ...state.trip, days: upsertDay(state.trip.days, a.day, { title: a.title }) });
    case 'LINE_STOP': {
      const id = `s${state.seq + 1}`;
      const days = upsertDay(state.trip.days, a.stop.day);
      const trip = { ...state.trip, days: days.map((d) => (d.day === a.stop.day ? { ...d, stops: [...d.stops, { ...a.stop, id }] } : d)) };
      return withTrip(state, trip, { seq: state.seq + 1, status: 'streaming' });
    }
    case 'LINE_BLOCK': {
      const t = state.trip;
      if (a.block === 'budget') return withTrip(state, { ...t, budget: a.data });
      if (a.block === 'checklist') return withTrip(state, { ...t, checklist: a.data });
      return withTrip(state, { ...t, tips: [...t.tips, a.data].slice(0, 3) });
    }

    // ── refine stream ──
    case 'LINE_OP': {
      const r = applyOp(state.trip, a.op, state.seq);
      if (!r) return { ...state, skipped: state.skipped + 1 };
      return { ...state, trip: r.trip, seq: r.seq, applied: state.applied + 1, pulse: [...state.pulse, ...r.touched] };
    }
    case 'LINE_NOTE':
      return { ...state, note: a.text };
    case 'SKIPPED':
      return { ...state, skipped: state.skipped + a.n };
    case 'RESET_SKIPPED':
      return { ...state, skipped: 0 };

    // ── run outcomes ──
    case 'RUN_DONE': {
      if (state.mode === 'refine') {
        if (state.applied === 0) {
          return { ...state, status: 'ready', trip: state.snapshot ?? state.trip, snapshot: null, banner: { kind: 'warn', code: 'no_change', title: 'No changes were made', hint: 'Lodestar could not turn that into edits. Try naming a day or a stop.' } };
        }
        return { ...state, status: 'ready', mode: null, note: state.note ?? 'Itinerary updated.' };
      }
      return { ...state, status: 'ready', mode: null, truncated: a.truncated };
    }
    case 'RUN_FAIL': {
      if (state.mode === 'refine') {
        // Refine is all-or-nothing: put the itinerary back exactly as it was.
        return { ...state, status: 'ready', mode: null, trip: state.snapshot ?? state.trip, snapshot: null, pulse: [], banner: { kind: 'error', scope: 'refine', ...a.error } };
      }
      if (countStops(state.trip) > 0) {
        return { ...state, status: 'ready', mode: null, truncated: false, banner: { kind: 'error', scope: 'plan', partial: true, ...a.error } };
      }
      return { ...state, status: 'error', mode: null, error: a.error };
    }
    case 'RUN_CANCEL': {
      if (state.mode === 'refine') return { ...state, status: 'ready', mode: null, trip: state.snapshot ?? state.trip, snapshot: null, pulse: [] };
      if (countStops(state.trip) > 0) return { ...state, status: 'ready', mode: null, banner: { kind: 'warn', code: 'stopped', title: 'Stopped early', hint: 'Showing the stops received so far.', scope: 'plan', partial: true } };
      return { ...initialState, prompt: state.prompt };
    }

    // ── user edits ──
    case 'REMOVE_STOP': {
      const day = state.trip.days.find((d) => d.stops.some((s) => s.id === a.id));
      if (!day) return state;
      const index = day.stops.findIndex((s) => s.id === a.id);
      return withTrip(state, setStops(state.trip, day.day, day.stops.filter((s) => s.id !== a.id)), { removed: { stop: day.stops[index], day: day.day, index, at: Date.now() }, pulse: [] });
    }
    case 'UNDO_REMOVE': {
      const r = state.removed;
      if (!r || !dayOf(state.trip, r.day)) return { ...state, removed: null };
      const stops = dayOf(state.trip, r.day).stops.slice();
      stops.splice(Math.min(r.index, stops.length), 0, r.stop);
      return withTrip(state, setStops(state.trip, r.day, stops), { removed: null });
    }
    case 'REORDER_DAY': {
      const day = dayOf(state.trip, a.day);
      const sameSet = day && a.stops.length === day.stops.length && a.stops.every((s) => day.stops.some((x) => x.id === s.id));
      return sameSet ? withTrip(state, setStops(state.trip, a.day, a.stops), { pulse: [] }) : state;
    }
    case 'NUDGE': {
      const day = state.trip.days.find((d) => d.stops.some((s) => s.id === a.id));
      if (!day) return state;
      const i = day.stops.findIndex((s) => s.id === a.id);
      const j = i + a.dir;
      if (j < 0 || j >= day.stops.length) return state;
      const stops = day.stops.slice();
      [stops[i], stops[j]] = [stops[j], stops[i]];
      return withTrip(state, setStops(state.trip, day.day, stops), { pulse: [] });
    }
    case 'MOVE_STOP_DAY': {
      const from = state.trip.days.find((d) => d.stops.some((s) => s.id === a.id));
      if (!from || from.day === a.day) return state;
      const max = state.trip.days.reduce((m, d) => Math.max(m, d.day), 0);
      if (!dayOf(state.trip, a.day) && (a.day !== max + 1 || a.day > MAX_DAYS)) return state;
      const stop = { ...from.stops.find((s) => s.id === a.id), day: a.day };
      let trip = setStops(state.trip, from.day, from.stops.filter((s) => s.id !== a.id));
      trip = { ...trip, days: upsertDay(trip.days, a.day) };
      trip = setStops(trip, a.day, [...dayOf(trip, a.day).stops, stop]);
      return withTrip(state, trip, { pulse: [a.id] });
    }

    // ── misc ──
    case 'UNDO_REFINE':
      return state.snapshot ? { ...state, trip: state.snapshot, snapshot: null, note: null, pulse: [], banner: null } : state;
    case 'LOAD':
      return { ...initialState, status: 'ready', prompt: a.prompt, sessionId: a.sessionId, trip: a.trip, seq: a.seq };
    case 'DISMISS_BANNER':
      return { ...state, banner: null, truncated: false, skipped: 0 };
    case 'CLEAR_PULSE':
      return state.pulse.length ? { ...state, pulse: [] } : state;
    case 'CLEAR_NOTE':
      return { ...state, note: null, snapshot: state.status === 'refining' ? state.snapshot : null };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}
