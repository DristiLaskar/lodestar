import { Copy, Download, Plus } from 'lucide-react';
import { fmtKm, fmtMoney } from '../lib/format';

export default function TripHeader({ meta, stats, streaming, onCopy, onDownload, onNew }) {
  const title = meta?.title || 'Charting your trip';
  return (
    <header className="triphead">
      <div className="triphead-main">
        {meta?.destination && <p className="triphead-dest">{meta.destination}</p>}
        <h1>{title}</h1>
        {meta?.summary && <p className="triphead-summary">{meta.summary}</p>}
        {meta?.bestFor?.length > 0 && (
          <ul className="tags" aria-label="Best for">{meta.bestFor.map((t) => <li key={t}>{t}</li>)}</ul>
        )}
      </div>
      <div className="triphead-side">
        <p className="triphead-stats">
          <span><b>{stats.days}</b> {stats.days === 1 ? 'day' : 'days'}</span>
          <span><b>{stats.stops}</b> stops</span>
          {stats.km > 0 && <span><b>{fmtKm(stats.km)}</b> km</span>}
          {stats.cost > 0 && <span>about <b>{fmtMoney(stats.cost, meta?.currency)}</b> each</span>}
        </p>
        <div className="triphead-actions">
          <button className="btn small" onClick={onCopy} disabled={streaming}><Copy size={14} /> Copy as text</button>
          <button className="btn small" onClick={onDownload} disabled={streaming}><Download size={14} /> Save file</button>
          <button className="btn small" onClick={onNew}><Plus size={14} /> New trip</button>
        </div>
      </div>
    </header>
  );
}
