import { useState } from 'react';
import { ChevronDown, CircleAlert, Pencil, RotateCcw } from 'lucide-react';

export default function ErrorPanel({ error, onRetry, onEdit }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="error-panel" role="alert">
      <CircleAlert size={30} className="error-icon" />
      <div>
        <h2>{error.title}</h2>
        <p>{error.hint}</p>
        {error.message && <p className="error-msg">{error.message}</p>}
        <div className="error-actions">
          {error.retryable && <button className="btn primary" onClick={onRetry}><RotateCcw size={15} /> Try again</button>}
          <button className="btn ghost" onClick={onEdit}><Pencil size={15} /> Edit the request</button>
        </div>
        {error.details && (
          <div className="error-details">
            <button className="link-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              What the model sent <ChevronDown size={14} className={open ? 'flip' : ''} />
            </button>
            {open && <pre>{error.details}</pre>}
          </div>
        )}
      </div>
    </section>
  );
}
