import { useCallback, useState } from 'react';
import { deleteSession, loadSessions, saveSession } from '../lib/storage';

export function useLogbook() {
  const [sessions, setSessions] = useState(loadSessions);
  const save = useCallback((s) => setSessions(saveSession(s)), []);
  const remove = useCallback((id) => setSessions(deleteSession(id)), []);
  return { sessions, save, remove };
}
