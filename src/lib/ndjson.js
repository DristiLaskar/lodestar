// Incremental NDJSON reader built for a model, not a machine:
//  - chunks can split lines anywhere (buffered until a newline)
//  - code fences and chatty prose between lines are ignored
//  - two objects glued on one line are separated
//  - cheap repairs: trailing commas, bare keys, smart quotes, Python literals
//  - an unparseable line is reported (onBad) and skipped; it never throws,
//    so one bad stop costs one stop instead of the whole itinerary
const FENCE = /^```[a-z]*|```$/gi;

export function repair(s) {
  return s
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":')
    .replace(/:\s*None\b/g, ': null')
    .replace(/:\s*True\b/g, ': true')
    .replace(/:\s*False\b/g, ': false')
    .replace(/:\s*NaN\b/g, ': null');
}

const tryParse = (s) => {
  for (const candidate of [s, repair(s)]) {
    try {
      const v = JSON.parse(candidate);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    } catch { /* next */ }
  }
  return undefined;
};

export function createNdjsonParser({ onObject, onBad = () => {} }) {
  let buf = '';
  let pending = ''; // an object that started on one line and may continue on the next
  let raw = '';

  const flushPending = () => {
    if (pending) onBad(pending);
    pending = '';
  };

  const consume = (line) => {
    const t = line.replace(FENCE, '').trim();
    if (!t) return;
    if (t[0] === '{') {
      flushPending();
      for (const piece of t.replace(/\}\s*\{(?=\s*["\w])/g, '}\n{').split('\n')) {
        const obj = tryParse(piece);
        if (obj) onObject(obj);
        else pending = piece;
      }
    } else if (pending) {
      pending += ` ${t}`;
      const obj = tryParse(pending);
      if (obj) {
        onObject(obj);
        pending = '';
      } else if (pending.length > 6000) flushPending();
    }
    // anything else is prose around the JSON: ignore
  };

  return {
    push(chunk) {
      raw = (raw + chunk).slice(-200_000);
      buf += chunk;
      const lines = buf.split('\n');
      buf = lines.pop();
      lines.forEach(consume);
    },
    flush() {
      if (buf) consume(buf);
      buf = '';
      flushPending();
    },
    raw: () => raw,
  };
}
