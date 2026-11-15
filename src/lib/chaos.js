// Modes of the failure lab (see server/chaos.js). The lab is a dev tool:
// it makes every kind of bad model output reproducible on demand.
export const CHAOS_MODES = [
  { id: 'ok', label: 'Real model', hint: 'Normal behaviour' },
  { id: 'fenced', label: 'Chatty and fenced', hint: 'Prose and code fences around the JSON' },
  { id: 'messy', label: 'Messy fields', hint: 'Strings for numbers, "9am", missing titles' },
  { id: 'malformed', label: 'Broken JSON', hint: 'Some lines repaired, some skipped' },
  { id: 'wrongshape', label: 'Wrong shape', hint: 'One big object with other field names' },
  { id: 'cutoff', label: 'Cut off', hint: 'Stream ends before the finish' },
  { id: 'slow', label: 'Slow start', hint: '14 s before the first token' },
  { id: 'stall', label: 'Stalls', hint: 'Goes quiet after four stops' },
  { id: 'empty', label: 'Refusal', hint: 'Plain prose, no data' },
  { id: 'error', label: 'Provider outage', hint: 'HTTP error before any output' },
  { id: 'ratelimit', label: 'Rate limited', hint: 'HTTP 429' },
];
