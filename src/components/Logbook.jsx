import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookMarked, Trash2, X } from 'lucide-react';
import { fmtDate } from '../lib/format';

export default function Logbook({ open, sessions, currentId, onClose, onOpen, onDelete }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="drawer" role="dialog" aria-modal="true" aria-label="Logbook" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 40 }}>
            <header>
              <h2><BookMarked size={18} /> Logbook</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close logbook"><X size={18} /></button>
            </header>
            {sessions.length === 0 ? (
              <p className="drawer-empty">Trips you chart are saved here automatically, on this device.</p>
            ) : (
              <ul className="log-list">
                {sessions.map((s) => {
                  const stops = s.trip.days.reduce((a, d) => a + (d.stops?.length ?? 0), 0);
                  return (
                    <li key={s.id} className={s.id === currentId ? 'is-current' : ''}>
                      <button className="log-open" onClick={() => onOpen(s)}>
                        <strong>{s.trip.meta?.title || 'Untitled trip'}</strong>
                        <span>{s.trip.days.length} days, {stops} stops, {fmtDate(s.updatedAt)}</span>
                        <em>{s.prompt}</em>
                      </button>
                      <button className="icon-btn small" onClick={() => onDelete(s.id)} aria-label={`Delete ${s.trip.meta?.title ?? 'trip'}`}><Trash2 size={16} /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
