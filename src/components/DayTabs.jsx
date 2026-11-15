import { motion } from 'framer-motion';
import { dayColor } from '../lib/format';

export default function DayTabs({ days, value, onChange }) {
  return (
    <div className="daytabs" role="tablist" aria-label="Days">
      {days.map((d) => (
        <button key={d.day} role="tab" aria-selected={d.day === value} className={`daytab ${d.day === value ? 'is-on' : ''}`} onClick={() => onChange(d.day)} style={{ '--c': dayColor(d.day) }}>
          <span className="daytab-dot" />
          Day {d.day}
          <span className="daytab-n">{d.stops.length}</span>
          {d.day === value && <motion.span layoutId="daytab-line" className="daytab-line" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
        </button>
      ))}
    </div>
  );
}
