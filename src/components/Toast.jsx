import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDone, toast.ms ?? 6000);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  return (
    <div className="toast-zone" role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className="toast" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}>
            <span>{toast.text}</span>
            {toast.action && <button className="link-btn" onClick={() => { toast.action.run(); onDone(); }}>{toast.action.label}</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
