import { CircleAlert, Info, RotateCcw, X } from 'lucide-react';

export default function Banner({ kind = 'warn', title, children, onRetry, onDismiss }) {
  const Icon = kind === 'error' ? CircleAlert : Info;
  return (
    <div className={`banner is-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <p><strong>{title}</strong> {children}</p>
      {onRetry && <button className="link-btn" onClick={onRetry}><RotateCcw size={13} /> Retry</button>}
      {onDismiss && <button className="icon-btn small" onClick={onDismiss} aria-label="Dismiss"><X size={15} /></button>}
    </div>
  );
}
