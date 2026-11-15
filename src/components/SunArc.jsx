import { toMinutes } from '../lib/schema';

// A small arc from 06:00 to midnight with a dot where each stop falls:
// shows at a glance whether a day is front-loaded, evening-heavy or evenly spread.
export default function SunArc({ stops }) {
  const R = 38;
  const pt = (t) => {
    const f = Math.min(1, Math.max(0, (t - 360) / 1080));
    const a = Math.PI * (1 - f);
    return [50 + R * Math.cos(a), 46 - R * Math.sin(a)];
  };
  return (
    <svg className="sunarc" viewBox="0 0 100 52" role="img" aria-label="When the stops fall across the day">
      <path d="M12 46A38 38 0 0 1 88 46" className="sunarc-line" />
      {stops.map((s) => {
        const m = toMinutes(s.time);
        if (m == null) return null;
        const [x, y] = pt(m);
        return <circle key={s.id} cx={x} cy={y} r="3.4" className="sunarc-dot" />;
      })}
      <line x1="6" y1="46" x2="94" y2="46" className="sunarc-base" />
    </svg>
  );
}
