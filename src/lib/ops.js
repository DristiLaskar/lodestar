// Refinement = the model sends small edit operations, we validate and apply
// them to the existing itinerary. Your manual edits survive, the change set
// is tiny, and one Undo restores the snapshot taken before the run.
import { MAX_DAYS, normalizeStop, toDay, clean } from './schema';
import { upsertDay } from './trip';

const locate = (trip, id) => {
  for (let d = 0; d < trip.days.length; d++) {
    const i = trip.days[d].stops.findIndex((s) => s.id === id);
    if (i >= 0) return { d, i };
  }
  return null;
};

const mapDay = (trip, day, fn) => ({ ...trip, days: trip.days.map((d) => (d.day === day ? { ...d, stops: fn(d.stops) } : d)) });

function insertAfter(stops, stop, op) {
  let at = stops.length;
  if ('afterId' in op) {
    if (op.afterId == null) at = 0;
    else {
      const i = stops.findIndex((s) => s.id === op.afterId);
      if (i >= 0) at = i + 1;
    }
  }
  const next = stops.slice();
  next.splice(at, 0, stop);
  return next;
}

// A day may exist already, or be exactly the next one.
function withDay(trip, day) {
  if (trip.days.some((d) => d.day === day)) return trip;
  const max = trip.days.reduce((m, d) => Math.max(m, d.day), 0);
  if (day !== max + 1 || day > MAX_DAYS) return null;
  return { ...trip, days: upsertDay(trip.days, day) };
}

/** Returns { trip, seq, touched } or null if the operation is invalid. */
export function applyOp(trip, op, seq) {
  switch (String(op?.op ?? '').toLowerCase()) {
    case 'add_stop': {
      const day = toDay(op.day ?? op.stop?.day);
      if (!day) return null;
      const stop = normalizeStop(op.stop ?? op, day);
      const t = stop && withDay(trip, day);
      if (!t) return null;
      const id = `s${seq + 1}`;
      return { trip: mapDay(t, day, (s) => insertAfter(s, { ...stop, id, day }, op)), seq: seq + 1, touched: [id] };
    }
    case 'remove_stop': {
      const loc = locate(trip, op.id);
      if (!loc) return null;
      const day = trip.days[loc.d].day;
      return { trip: mapDay(trip, day, (s) => s.filter((x) => x.id !== op.id)), seq, touched: [] };
    }
    case 'update_stop': {
      const loc = locate(trip, op.id);
      if (!loc || !op.changes || typeof op.changes !== 'object') return null;
      const old = trip.days[loc.d].stops[loc.i];
      // eslint-disable-next-line no-unused-vars
      const { day: _day, id: _id, ...changes } = op.changes;
      const merged = normalizeStop({ ...old, ...changes }, old.day);
      if (!merged) return null;
      const next = { ...merged, id: old.id, day: old.day };
      return { trip: mapDay(trip, old.day, (s) => s.map((x) => (x.id === old.id ? next : x))), seq, touched: [old.id] };
    }
    case 'move_stop': {
      const loc = locate(trip, op.id);
      if (!loc) return null;
      const stop = trip.days[loc.d].stops[loc.i];
      const day = toDay(op.day, stop.day);
      let t = withDay(trip, day);
      if (!t) return null;
      t = mapDay(t, stop.day, (s) => s.filter((x) => x.id !== stop.id));
      t = mapDay(t, day, (s) => insertAfter(s, { ...stop, day }, op));
      return { trip: t, seq, touched: [stop.id] };
    }
    case 'update_day': {
      const day = toDay(op.day);
      const title = clean(op.title, 60);
      if (!day || !title || !trip.days.some((d) => d.day === day)) return null;
      return { trip: { ...trip, days: upsertDay(trip.days, day, { title }) }, seq, touched: [] };
    }
    case 'update_trip': {
      const ch = op.changes;
      if (!ch || typeof ch !== 'object') return null;
      const title = clean(ch.title, 90);
      const summary = clean(ch.summary, 280);
      if (!title && !summary) return null;
      return { trip: { ...trip, meta: { ...(trip.meta ?? {}), ...(title && { title }), ...(summary && { summary }) } }, seq, touched: [] };
    }
    default:
      return null;
  }
}
