import { AnimatePresence, Reorder } from 'framer-motion';
import { Plus } from 'lucide-react';
import StopRow from './StopRow';
import SunArc from './SunArc';
import { dayColor, fmtDuration, fmtKm, fmtMoney } from '../lib/format';
import { dayStats, leg } from '../lib/trip';

export default function DayView({ day, dayOptions, currency, openIds, activeId, pulse, streaming, handlers }) {
  const stats = dayStats(day);
  const color = dayColor(day.day);

  return (
    <section className="dayview" style={{ '--c': color }} aria-label={`Day ${day.day}`}>
      <header className="dayhead">
        <div className="daynum" aria-hidden="true">{day.day}</div>
        <div className="dayhead-text">
          <h2>{day.title || `Day ${day.day}`}</h2>
          {day.stops.length > 0 && (
            <p className="daystats">
              <span>{stats.stops} {stats.stops === 1 ? 'stop' : 'stops'}</span>
              <span>{fmtDuration(stats.minutes)} on site</span>
              {stats.km > 0 && <span>{fmtKm(stats.km)} km between stops</span>}
              {stats.cost > 0 && <span>about {fmtMoney(stats.cost, currency)} each</span>}
            </p>
          )}
        </div>
        <SunArc stops={day.stops} />
      </header>

      {day.stops.length === 0 ? (
        <div className="day-empty">
          <p>Nothing planned for day {day.day}.</p>
          <button className="btn" onClick={() => handlers.onFillDay(day.day)}><Plus size={15} /> Ask Lodestar to fill it</button>
        </div>
      ) : (
        <Reorder.Group as="ol" axis="y" values={day.stops} onReorder={(stops) => handlers.onReorder(day.day, stops)} className="stops">
          <AnimatePresence initial={false}>
            {day.stops.map((s, i) => (
              <StopRow
                key={s.id}
                stop={s}
                index={i}
                total={day.stops.length}
                color={color}
                expanded={openIds.has(s.id)}
                active={activeId === s.id}
                fresh={pulse.includes(s.id)}
                leg={i < day.stops.length - 1 ? leg(s, day.stops[i + 1]) : null}
                currency={currency}
                dayOptions={dayOptions}
                onToggle={() => handlers.onToggle(s.id)}
                onActive={handlers.onActive}
                onRemove={handlers.onRemove}
                onNudge={handlers.onNudge}
                onMoveDay={handlers.onMoveDay}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
      {streaming && <p className="charting" role="status"><span className="pulse-dot" /> Still charting, more stops are on the way</p>}
    </section>
  );
}
