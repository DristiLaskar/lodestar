import { useEffect, useState } from 'react';
import { Check, LoaderCircle, X } from 'lucide-react';
import SkyDisc from './SkyDisc';

// While nothing has arrived yet the disc is simply being scanned. The
// checklist is tied to what has really come back, not to a fake timer.
export default function LoadingState({ hasMeta, onCancel }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { label: 'Request sent', done: true },
    { label: 'Outline of the trip', done: hasMeta },
    { label: 'Placing the first stop', done: false },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <section className="loading" aria-live="polite" aria-busy="true">
      <div className="loading-disc"><SkyDisc days={[]} scanning label="Searching for your destination" /></div>
      <div className="loading-copy">
        <h2>Charting your trip</h2>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s.label} className={s.done ? 'is-done' : i === current ? 'is-now' : ''}>
              <span className="step-dot">{s.done ? <Check size={13} /> : i === current ? <LoaderCircle size={13} className="spin" /> : null}</span>
              {s.label}
            </li>
          ))}
        </ol>
        {secs >= 12 && (
          <p className="slow-note">
            Still waiting on the model ({secs} s). Free tiers can be slow at busy times.
          </p>
        )}
        <button className="btn ghost" onClick={onCancel}><X size={14} /> Cancel</button>
      </div>
    </section>
  );
}
