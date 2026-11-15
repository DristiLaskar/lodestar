// The logbook: saved trips in localStorage. Reads are defensive because the
// data may be old, hand-edited or corrupted.
const KEY = 'lodestar.logbook.v1';
const MAX = 20;

export function loadSessions() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return (Array.isArray(list) ? list : [])
      .filter((s) => s && typeof s.id === 'string' && s.trip && Array.isArray(s.trip.days))
      .map((s) => ({ id: s.id, prompt: String(s.prompt ?? ''), createdAt: Number(s.createdAt) || 0, updatedAt: Number(s.updatedAt) || 0, trip: s.trip }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

const write = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota or private mode: keep working in memory */ }
  return list;
};

export function saveSession(session) {
  const list = loadSessions();
  const prev = list.find((s) => s.id === session.id);
  const next = [{ ...session, createdAt: prev?.createdAt ?? session.updatedAt }, ...list.filter((s) => s.id !== session.id)];
  return write(next.slice(0, MAX));
}

export const deleteSession = (id) => write(loadSessions().filter((s) => s.id !== id));
