import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const ROWS = [
  ['/', 'Jump to the text box'],
  ['[  ]', 'Previous or next day'],
  ['↑  ↓', 'Move between stops'],
  ['Enter', 'Open or close a stop'],
  ['Alt + ↑ ↓', 'Move a stop earlier or later'],
  ['Delete', 'Remove the focused stop'],
  ['Ctrl/⌘ + Enter', 'Send from the text box'],
  ['?', 'Show or hide this list'],
  ['Esc', 'Close panels'],
];

export default function Shortcuts({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" initial={{ y: 14, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8 }} onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Keyboard shortcuts</h2>
              <button className="icon-btn small" onClick={onClose} aria-label="Close"><X size={16} /></button>
            </header>
            <dl>
              {ROWS.map(([k, d]) => (
                <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>
              ))}
            </dl>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
