export const fmtDuration = (min) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

export const fmtKm = (km) => (km < 10 ? km.toFixed(1) : String(Math.round(km)));

export function fmtMoney(n, currency) {
  if (n == null) return '';
  try {
    return new Intl.NumberFormat(undefined, currency ? { style: 'currency', currency, maximumFractionDigits: 0 } : { maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency ? `${currency} ` : ''}${Math.round(n).toLocaleString()}`;
  }
}

export const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export const dayColor = (n) => `var(--d${((n - 1) % 10) + 1})`;
