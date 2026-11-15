// The model is unpredictable, so nothing it says reaches the UI raw.
// Every object goes through these normalisers: they accept the common ways
// a model drifts (strings for numbers, "9am", alias field names, odd casing),
// clamp what is out of range, and return null when an item is unusable so
// the caller can skip it and keep going.
export const MAX_DAYS = 10;
export const KINDS = ['sight', 'food', 'activity', 'nature', 'culture', 'transit', 'stay', 'nightlife', 'shopping'];
export const DEFAULT_MIN = { sight: 60, food: 75, activity: 90, nature: 90, culture: 75, transit: 45, stay: 30, nightlife: 120, shopping: 60 };

const ALIASES = {
  restaurant: 'food', dining: 'food', meal: 'food', cafe: 'food', eat: 'food', lunch: 'food', dinner: 'food', breakfast: 'food',
  museum: 'culture', temple: 'culture', shrine: 'culture', gallery: 'culture', heritage: 'culture', history: 'culture',
  landmark: 'sight', attraction: 'sight', viewpoint: 'sight', monument: 'sight', sightseeing: 'sight',
  hike: 'nature', park: 'nature', beach: 'nature', garden: 'nature', walk: 'nature', outdoor: 'nature',
  travel: 'transit', transport: 'transit', flight: 'transit', train: 'transit', transfer: 'transit',
  hotel: 'stay', lodging: 'stay', accommodation: 'stay', checkin: 'stay',
  bar: 'nightlife', club: 'nightlife', night: 'nightlife', evening: 'nightlife',
  market: 'shopping', shop: 'shopping', store: 'shopping',
  tour: 'activity', experience: 'activity', class: 'activity', adventure: 'activity',
};

export const clean = (v, max = 400) => {
  if (typeof v === 'number') v = String(v);
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
};

export const toNum = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  if (/^\s*(free|none|nil)\s*$/i.test(v)) return 0;
  const m = v.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

const pad = (n) => String(n).padStart(2, '0');

export function normalizeKind(v) {
  const k = clean(v, 30).toLowerCase();
  if (KINDS.includes(k)) return k;
  if (ALIASES[k]) return ALIASES[k];
  const hit = Object.keys(ALIASES).find((a) => k.includes(a));
  return hit ? ALIASES[hit] : 'sight';
}

export function parseTime(v) {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d{1,2})(?:[:.h](\d{2}))?\s*([ap])?\.?m?\.?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.toLowerCase();
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

export const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function parseDuration(v) {
  const n = toNum(v);
  if (n == null) return null;
  if (typeof v === 'string' && /h(ou)?r/i.test(v) && !/min/i.test(v)) return Math.round(n * 60);
  return Math.round(n);
}

export function toDay(v, fallback = null) {
  const n = toNum(v);
  if (n == null) return fallback;
  const d = Math.round(n);
  return d >= 1 && d <= MAX_DAYS ? d : fallback;
}

const firstDefined = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

export function normalizeStop(raw, fallbackDay = 1) {
  if (!raw || typeof raw !== 'object') return null;
  const title = clean(firstDefined(raw.title, raw.name, raw.place, raw.activity), 90);
  if (!title) return null;

  const kind = normalizeKind(firstDefined(raw.kind, raw.category, ['stop', 'op'].includes(raw.type) ? undefined : raw.type));
  const c = raw.coordinates;
  let lat = toNum(firstDefined(raw.lat, raw.latitude, c?.lat, c?.latitude, Array.isArray(c) ? c[0] : undefined));
  let lng = toNum(firstDefined(raw.lng, raw.lon, raw.long, raw.longitude, c?.lng, c?.lon, c?.longitude, Array.isArray(c) ? c[1] : undefined));
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
    lat = null;
    lng = null;
  }

  let duration = parseDuration(firstDefined(raw.durationMin, raw.duration, raw.minutes));
  duration = duration == null || duration <= 0 ? DEFAULT_MIN[kind] : Math.min(720, Math.max(10, duration));

  const cost = toNum(firstDefined(raw.costEstimate, raw.cost, raw.price));

  return {
    day: toDay(raw.day, fallbackDay ?? 1),
    title,
    kind,
    time: parseTime(firstDefined(raw.time, raw.start, raw.startTime)),
    durationMin: duration,
    area: clean(raw.area ?? raw.neighbourhood ?? raw.neighborhood ?? raw.location, 50),
    description: clean(firstDefined(raw.description, raw.desc, raw.details, raw.notes, raw.summary), 320),
    tip: clean(raw.tip, 200),
    costEstimate: cost == null || cost < 0 ? null : Math.round(cost),
    lat,
    lng,
  };
}

export function normalizeMeta(raw) {
  const destination = clean(raw?.destination ?? raw?.location, 70);
  const cur = clean(raw?.currency, 4).toUpperCase();
  return {
    title: clean(raw?.title ?? raw?.name, 90) || destination || 'Your trip',
    destination,
    summary: clean(raw?.summary ?? raw?.overview, 280),
    currency: /^[A-Z]{3}$/.test(cur) ? cur : '',
    bestFor: (Array.isArray(raw?.bestFor) ? raw.bestFor : []).map((t) => clean(t, 24)).filter(Boolean).slice(0, 4),
  };
}

export function normalizeBudget(raw) {
  const items = (Array.isArray(raw?.items) ? raw.items : [])
    .map((i) => ({ label: clean(i?.label ?? i?.name, 24), amount: toNum(i?.amount ?? i?.value) }))
    .filter((i) => i.label && i.amount > 0)
    .slice(0, 8);
  return items.length ? { items } : null;
}

export function normalizeChecklist(raw) {
  const items = (Array.isArray(raw?.items) ? raw.items : []).map((t) => clean(typeof t === 'object' ? t?.text : t, 100)).filter(Boolean).slice(0, 12);
  return items.length ? { title: clean(raw?.title, 40) || 'Before you go', items } : null;
}

export function normalizeTip(raw) {
  const text = clean(raw?.text ?? raw?.body, 200);
  return text ? { title: clean(raw?.title, 40), text } : null;
}

/**
 * Turn one parsed object from the stream into a typed, validated message.
 * kind 'skip' means "this was unusable": the caller counts it and moves on.
 */
export function ingest(obj, ctx = { day: 1 }) {
  switch (String(obj?.type ?? '').toLowerCase()) {
    case 'trip': return { kind: 'trip', data: normalizeMeta(obj) };
    case 'day': {
      const day = toDay(obj.day);
      return day ? { kind: 'day', data: { day, title: clean(obj.title ?? obj.theme, 60) } } : { kind: 'skip' };
    }
    case 'stop': {
      const stop = normalizeStop(obj, toDay(obj.day, ctx.day));
      return stop ? { kind: 'stop', data: stop } : { kind: 'skip' };
    }
    case 'budget': { const d = normalizeBudget(obj); return d ? { kind: 'budget', data: d } : { kind: 'skip' }; }
    case 'checklist': { const d = normalizeChecklist(obj); return d ? { kind: 'checklist', data: d } : { kind: 'skip' }; }
    case 'tip': { const d = normalizeTip(obj); return d ? { kind: 'tip', data: d } : { kind: 'skip' }; }
    case 'op': return { kind: 'op', data: obj };
    case 'note': { const t = clean(obj.text, 240); return t ? { kind: 'note', data: t } : { kind: 'skip' }; }
    case 'error': return { kind: 'error', data: { code: clean(obj.code, 30), message: clean(obj.message, 240) } };
    case 'done': return { kind: 'done' };
    default: return { kind: 'skip' };
  }
}

// ── fallback for models that ignore NDJSON and return one big object ──────
const pickArray = (o, keys) => keys.map((k) => o?.[k]).find(Array.isArray);

function daysToLines(days) {
  const out = [];
  days.forEach((d, i) => {
    if (!d || typeof d !== 'object') return;
    const day = toDay(firstDefined(d.day, d.dayNumber, d.day_number), i + 1);
    out.push({ type: 'day', day, title: firstDefined(d.title, d.theme, d.label, d.name) });
    const stops = pickArray(d, ['stops', 'activities', 'items', 'places', 'schedule', 'plan']);
    stops?.forEach((s) => out.push({ ...(typeof s === 'object' && s ? s : { title: String(s) }), category: s?.category ?? s?.type, type: 'stop', day }));
  });
  return out;
}

export function wholeToLines(value) {
  if (Array.isArray(value)) {
    if (value.length && value.every((v) => v && typeof v.type === 'string')) return value;
    return daysToLines(value);
  }
  if (!value || typeof value !== 'object') return [];
  if (typeof value.type === 'string') return [value];
  const root = value.trip && typeof value.trip === 'object' ? value.trip : value;
  const days = pickArray(root, ['days', 'itinerary', 'plan', 'schedule', 'dailyPlan', 'daily_itinerary']);
  if (!days) return [];
  const meta = { type: 'trip', title: firstDefined(root.title, root.name, root.tripName), destination: firstDefined(root.destination, root.location), summary: firstDefined(root.summary, root.overview, root.description), currency: root.currency };
  return [meta, ...daysToLines(days)];
}

/** Pull the first JSON value out of text that may have prose or fences around it. */
export function extractJson(text) {
  const t = text.replace(/```(?:json)?/gi, '');
  for (const [open, close] of [['{', '}'], ['[', ']']]) {
    const a = t.indexOf(open);
    const b = t.lastIndexOf(close);
    if (a >= 0 && b > a) {
      try { return JSON.parse(t.slice(a, b + 1)); } catch { /* try next shape */ }
    }
  }
  return null;
}
