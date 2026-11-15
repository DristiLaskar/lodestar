import { normalizeStop, normalizeMeta, normalizeBudget, normalizeChecklist, normalizeTip, toDay, toMinutes } from './schema';

export const emptyTrip = () => ({ meta: null, days: [], budget: null, checklist: null, tips: [] });

export const upsertDay = (days, day, patch = {}) => {
  if (!days.some((d) => d.day === day)) return [...days, { day, title: '', stops: [], ...patch }].sort((a, b) => a.day - b.day);
  return days.map((d) => (d.day === day ? { ...d, ...patch } : d));
};

export const setStops = (trip, day, stops) => ({ ...trip, days: trip.days.map((d) => (d.day === day ? { ...d, stops } : d)) });
export const allStops = (trip) => trip?.days.flatMap((d) => d.stops) ?? [];
export const countStops = (trip) => allStops(trip).length;

// ── distances ──────────────────────────────────────────────────────────────
export function haversine(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Rough hop between two stops: straight line ×1.3 for streets, mode by distance. */
export function leg(a, b) {
  if (a?.lat == null || b?.lat == null) return null;
  const km = haversine(a, b) * 1.3;
  const mode = km < 2.5 ? 'walk' : km < 12 ? 'transit' : 'drive';
  const speed = { walk: 4.8, transit: 20, drive: 45 }[mode];
  return { km, mode, min: Math.max(3, Math.round((km / speed) * 60)) };
}

export function dayStats(day) {
  let km = 0;
  day.stops.forEach((s, i) => {
    const l = i ? leg(day.stops[i - 1], s) : null;
    if (l) km += l.km;
  });
  return {
    stops: day.stops.length,
    minutes: day.stops.reduce((m, s) => m + s.durationMin, 0),
    cost: day.stops.reduce((m, s) => m + (s.costEstimate ?? 0), 0),
    km,
  };
}

export function tripStats(trip) {
  const per = trip.days.map(dayStats);
  return {
    days: trip.days.length,
    stops: per.reduce((a, d) => a + d.stops, 0),
    km: per.reduce((a, d) => a + d.km, 0),
    cost: per.reduce((a, d) => a + d.cost, 0),
  };
}

export function phaseOf(time) {
  const m = toMinutes(time);
  if (m == null) return 'day';
  if (m < 9 * 60) return 'dawn';
  if (m < 16 * 60) return 'day';
  if (m < 20 * 60) return 'dusk';
  return 'night';
}

// ── what the refine endpoint gets to see ───────────────────────────────────
export const toModelTrip = (trip) => ({
  title: trip.meta?.title ?? '',
  destination: trip.meta?.destination ?? '',
  currency: trip.meta?.currency ?? '',
  days: trip.days.map((d) => ({ day: d.day, title: d.title })),
  stops: trip.days.flatMap((d) => d.stops.map((s) => ({ id: s.id, day: d.day, title: s.title, kind: s.kind, time: s.time, durationMin: s.durationMin, area: s.area }))),
});

// ── export ─────────────────────────────────────────────────────────────────
export function toMarkdown(trip) {
  const m = trip.meta ?? {};
  const out = [`# ${m.title ?? 'Trip'}`, m.destination && `*${m.destination}*`, m.summary, ''].filter((x) => x !== undefined && x !== null && x !== false);
  trip.days.forEach((d) => {
    out.push(`## Day ${d.day}${d.title ? `: ${d.title}` : ''}`);
    d.stops.forEach((s, i) => {
      out.push(`${i + 1}. **${s.time ?? '--:--'}** ${s.title}${s.area ? ` (${s.area})` : ''}`);
      if (s.description) out.push(`   ${s.description}`);
      if (s.tip) out.push(`   Tip: ${s.tip}`);
    });
    out.push('');
  });
  if (trip.checklist) out.push(`## ${trip.checklist.title}`, ...trip.checklist.items.map((i) => `- [ ] ${i}`));
  return out.join('\n');
}

// ── loading saved data from localStorage: treat it as untrusted too ───────
export function sanitizeTrip(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.days)) return null;
  let seq = 0;
  const days = raw.days
    .map((d, i) => {
      const day = toDay(d?.day, i + 1);
      const stops = (Array.isArray(d?.stops) ? d.stops : [])
        .map((s) => normalizeStop(s, day))
        .filter(Boolean)
        .map((s) => ({ ...s, day, id: `s${++seq}` }));
      return { day, title: typeof d?.title === 'string' ? d.title.slice(0, 60) : '', stops };
    })
    .filter((d, i, arr) => arr.findIndex((x) => x.day === d.day) === i)
    .sort((a, b) => a.day - b.day);
  if (!days.some((d) => d.stops.length)) return null;
  return {
    seq,
    trip: {
      meta: raw.meta ? normalizeMeta(raw.meta) : normalizeMeta({}),
      days,
      budget: raw.budget ? normalizeBudget(raw.budget) : null,
      checklist: raw.checklist ? normalizeChecklist(raw.checklist) : null,
      tips: (Array.isArray(raw.tips) ? raw.tips : []).map(normalizeTip).filter(Boolean).slice(0, 3),
    },
  };
}
