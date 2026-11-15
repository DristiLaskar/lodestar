import { UpstreamError } from './llm.js';
import { PLAN, REFINE, ALT_SHAPE } from './mockTrip.js';

// The "failure lab": reproducible bad model behaviour. Only reachable outside
// production, via the x-chaos request header set by the UI's lab menu.
export const CHAOS_MODES = ['ok', 'fenced', 'messy', 'malformed', 'wrongshape', 'cutoff', 'slow', 'stall', 'empty', 'error', 'ratelimit'];

const rand = ([a, b]) => a + Math.random() * (b - a);
const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
  });

async function* emit(lines, { signal, delay = [220, 520] } = {}) {
  for (const line of lines) {
    if (signal?.aborted) return;
    await sleep(rand(delay), signal);
    if (signal?.aborted) return;
    // Split long lines across two chunks, like a real token stream would.
    if (line.length > 40) {
      const cut = Math.floor(line.length * 0.6);
      yield line.slice(0, cut);
      await sleep(40, signal);
      yield `${line.slice(cut)}\n`;
    } else {
      yield `${line}\n`;
    }
  }
}

const messy = (obj, i) => {
  if (obj.type !== 'stop') return obj;
  const o = { ...obj };
  switch (i % 6) {
    case 0: o.lat = String(o.lat); o.lng = String(o.lng); o.day = `Day ${o.day}`; break;
    case 1: o.durationMin = '1.5 hours'; o.time = '9am'; o.kind = 'Temple'; break;
    case 2: o.costEstimate = `¥${o.costEstimate.toLocaleString()}`; o.time = '2:30 PM'; break;
    case 3: delete o.description; o.name = o.title; delete o.title; break;
    case 4: o.durationMin = -20; o.lat = 999; o.kind = 'FOOD'; break;
    case 5: delete o.title; delete o.name; break; // unusable → must be skipped
  }
  return o;
};

export async function* streamMock({ kind = 'plan', mode = 'ok', signal } = {}) {
  const source = kind === 'refine' ? REFINE : PLAN;
  const lines = source.map((o) => JSON.stringify(o));

  switch (mode) {
    case 'error':
      throw new UpstreamError('Simulated provider outage (HTTP 503).', { status: 502, code: 'upstream_error' });
    case 'ratelimit':
      throw new UpstreamError('Simulated provider rate limit (HTTP 429).', { status: 429, code: 'rate_limit' });
    case 'empty':
      yield "I'm sorry, but I can't help with that request.";
      return;
    case 'wrongshape':
      await sleep(900, signal);
      yield JSON.stringify(ALT_SHAPE, null, 2);
      return;
    case 'fenced':
      yield "Sure! Here's your itinerary:\n\n```json\n";
      yield* emit(lines, { signal });
      yield '```\nHope that helps!\n';
      return;
    case 'messy': {
      let i = 0;
      yield* emit(source.map((o) => JSON.stringify(messy(o, o.type === 'stop' ? i++ : 0))), { signal });
      return;
    }
    case 'malformed': {
      let i = 0;
      const broken = lines.map((l, idx) => {
        if (source[idx].type !== 'stop') return l;
        const k = i++;
        if (k % 4 === 1) return l.slice(0, -1); // missing brace → unrecoverable
        if (k % 4 === 2) return l.replace(/\}$/, ',}'); // trailing comma → repairable
        if (k % 4 === 3) return l.replace(/"(\w+)":/g, '$1:'); // bare keys → repairable
        return l;
      });
      broken.splice(4, 0, 'Let me think about the next stop for a moment...');
      yield* emit(broken, { signal });
      return;
    }
    case 'cutoff':
      yield* emit(lines.slice(0, Math.floor(lines.length * 0.6)), { signal });
      return;
    case 'stall':
      yield* emit(lines.slice(0, 4), { signal });
      await sleep(120_000, signal);
      return;
    case 'slow':
      await sleep(14_000, signal);
      if (signal?.aborted) return;
      yield* emit(lines, { signal });
      return;
    default:
      yield* emit(lines, { signal });
  }
}
