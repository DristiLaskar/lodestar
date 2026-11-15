import { useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import { fmtMoney } from '../lib/format';

const SLICES = ['var(--d1)', 'var(--d2)', 'var(--d3)', 'var(--d4)', 'var(--d5)', 'var(--d6)', 'var(--d7)', 'var(--d8)'];

function Budget({ budget, currency }) {
  const total = budget.items.reduce((a, i) => a + i.amount, 0);
  let acc = 0;
  return (
    <section className="note budget" aria-label="Budget estimate per person">
      <h3>Budget per person</h3>
      <div className="budget-body">
        <svg viewBox="0 0 42 42" className="donut" role="img" aria-label={`Total about ${fmtMoney(total, currency)}`}>
          <circle cx="21" cy="21" r="15.915" className="donut-track" />
          {budget.items.map((it, i) => {
            const f = it.amount / total;
            const el = (
              <circle key={it.label} cx="21" cy="21" r="15.915" pathLength="1" className="donut-seg" style={{ stroke: SLICES[i % SLICES.length], '--f': f, strokeDashoffset: -acc, animationDelay: `${i * 90}ms` }} />
            );
            acc += f;
            return el;
          })}
        </svg>
        <div>
          <p className="budget-total">{fmtMoney(total, currency)}</p>
          <ul className="legend">
            {budget.items.map((it, i) => (
              <li key={it.label}><i style={{ background: SLICES[i % SLICES.length] }} />{it.label}<b>{fmtMoney(it.amount, currency)}</b></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Checklist({ list }) {
  const [done, setDone] = useState(() => new Set());
  const toggle = (i) => setDone((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  return (
    <section className="note checklist" aria-label={list.title}>
      <h3>{list.title}</h3>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={list.items.length} aria-valuenow={done.size}>
        <span style={{ width: `${(done.size / list.items.length) * 100}%` }} />
      </div>
      <ul>
        {list.items.map((t, i) => (
          <li key={t}>
            <label className={done.has(i) ? 'is-done' : ''}>
              <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} />
              <span className="box">{done.has(i) && <Check size={13} strokeWidth={3} />}</span>
              {t}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Extras({ trip }) {
  const currency = trip.meta?.currency;
  if (!trip.budget && !trip.checklist && !trip.tips.length) return null;
  return (
    <div className="extras">
      {trip.budget && <Budget budget={trip.budget} currency={currency} />}
      {trip.checklist && <Checklist list={trip.checklist} />}
      {trip.tips.map((t) => (
        <aside key={t.text} className="note tip">
          <Lightbulb size={18} />
          <p>{t.title && <strong>{t.title}. </strong>}{t.text}</p>
        </aside>
      ))}
    </div>
  );
}
