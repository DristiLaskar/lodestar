import { useState } from 'react';
import { LoaderCircle, Send, Undo2 } from 'lucide-react';
import { REFINE_IDEAS } from '../lib/examples';

export default function RefineBar({ onSubmit, busy, disabled, canUndo, onUndo, inputRef, prefill }) {
  const [text, setText] = useState('');
  const [lastPrefill, setLastPrefill] = useState(null);
  if (prefill && prefill.n !== lastPrefill) { setLastPrefill(prefill.n); setText(prefill.text); }

  const send = (value) => {
    const v = value.trim();
    if (v.length < 2 || busy || disabled) return;
    onSubmit(v);
    setText('');
  };

  return (
    <div className="refine">
      <div className="refine-ideas" aria-label="Quick changes">
        {REFINE_IDEAS.map((idea) => (
          <button key={idea} type="button" className="chip-btn" disabled={busy || disabled} onClick={() => send(idea)}>{idea}</button>
        ))}
      </div>
      <form className="refine-bar" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <label className="sr-only" htmlFor="refine">Change the itinerary</label>
        <input id="refine" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} maxLength={600} disabled={disabled} autoComplete="off" placeholder={disabled ? 'Wait for the trip to finish charting…' : 'Change something: “make day 2 more relaxed”'} />
        {canUndo && <button type="button" className="btn ghost small" onClick={onUndo}><Undo2 size={14} /> Undo last change</button>}
        <button className="btn primary small" disabled={busy || disabled || text.trim().length < 2} aria-label="Apply change">
          {busy ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
          <span className="hide-sm">{busy ? 'Editing' : 'Apply'}</span>
        </button>
      </form>
    </div>
  );
}
