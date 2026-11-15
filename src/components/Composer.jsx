import { useEffect, useRef } from 'react';
import { Sparkles, Square } from 'lucide-react';

export const MAX_PROMPT = 1200;
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

export default function Composer({ value, onChange, onSubmit, onCancel, busy, compact, inputRef }) {
  const local = useRef(null);
  const ref = inputRef ?? local;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, compact ? 112 : 240)}px`;
  }, [value, compact, ref]);

  const tooShort = value.trim().length < 3;
  const submit = (e) => { e?.preventDefault(); if (!tooShort) onSubmit(value); };

  return (
    <form className={`composer ${compact ? 'is-compact' : ''} ${busy ? 'is-busy' : ''}`} onSubmit={submit}>
      <label className="sr-only" htmlFor="prompt">Describe your trip</label>
      <textarea
        id="prompt"
        ref={ref}
        rows={compact ? 1 : 3}
        maxLength={MAX_PROMPT}
        value={value}
        placeholder="A slow week in Kyoto for two: temples, tea houses, no rushing, mid-range budget."
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }}
      />
      <div className="composer-bar">
        {!compact && <span className="composer-hint"><kbd>{MOD}</kbd> <kbd>Enter</kbd> to send</span>}
        <span className="composer-count" aria-hidden="true">{value.length > 900 ? `${value.length}/${MAX_PROMPT}` : ''}</span>
        {busy && (
          <button type="button" className="btn ghost" onClick={onCancel}><Square size={14} /> Stop</button>
        )}
        <button className="btn primary" disabled={tooShort}>
          <Sparkles size={16} />
          {busy ? 'Start over' : compact ? 'Chart again' : 'Chart this trip'}
        </button>
      </div>
    </form>
  );
}
