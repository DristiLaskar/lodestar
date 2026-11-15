import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { project, routePath } from '../lib/geo';
import { dayColor } from '../lib/format';

const SIZE = 560;
const C = SIZE / 2;
const R = 232;
const STAR = (r) => `M0 ${-r}Q0 0 ${r} 0Q0 0 0 ${r}Q0 0 ${-r} 0Q0 0 0 ${-r}Z`;
const short = (t, n = 24) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/**
 * The star map: every stop with coordinates is a star on a planisphere disc,
 * the selected day's route is drawn between them, and the rim turns slowly.
 * It is the same component for the live itinerary, the loading state (an
 * empty disc being scanned) and the home screen demo.
 *
 * `frame` = the stops used to fit the projection. Passing the whole trip
 * keeps stars from drifting when you switch days.
 */
function SkyDisc({ days, frame, selectedDay, activeId, onSelect, scanning = false, label = 'Star map of the itinerary' }) {
  const reduce = useReducedMotion();
  const stops = useMemo(() => days.flatMap((d) => d.stops.map((s, i) => ({ ...s, index: i }))), [days]);
  const pos = useMemo(() => project(frame ?? stops, SIZE, 118), [frame, stops]);
  const placed = stops.filter((s) => pos.has(s.id));

  const routes = days
    .map((d) => ({ day: d.day, pts: d.stops.filter((s) => pos.has(s.id)).map((s) => pos.get(s.id)) }))
    .filter((r) => r.pts.length > 1);
  const selected = routes.find((r) => r.day === selectedDay);
  const others = routes.filter((r) => r.day !== selectedDay);
  const selectedD = selected ? routePath(selected.pts) : '';
  const active = placed.find((s) => s.id === activeId);

  return (
    <svg className={`sky ${scanning ? 'is-scanning' : ''}`} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      <defs>
        <radialGradient id="disc-fill" cx="50%" cy="42%" r="60%">
          <stop offset="0" stopColor="var(--disc-a)" />
          <stop offset="1" stopColor="var(--disc-b)" />
        </radialGradient>
        <linearGradient id="sweep-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--star)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--star)" stopOpacity=".45" />
        </linearGradient>
        <clipPath id="disc-clip"><circle cx={C} cy={C} r={R} /></clipPath>
      </defs>

      <circle cx={C} cy={C} r={R} fill="url(#disc-fill)" />

      <g clipPath="url(#disc-clip)" className="sky-grid">
        {[1, 2, 3].map((k) => <circle key={k} cx={C} cy={C} r={(R / 4) * k} />)}
        {Array.from({ length: 12 }, (_, k) => (
          <line key={k} x1={C} y1={C} x2={C} y2={C - R} transform={`rotate(${k * 30} ${C} ${C})`} />
        ))}
        {scanning && <path className="sky-sweep" d={`M${C} ${C}L${C} ${C - R}A${R} ${R} 0 0 1 ${C + R * Math.sin(0.72)} ${C - R * Math.cos(0.72)}Z`} fill="url(#sweep-fill)" />}

        {others.map((r) => (
          <path key={r.day} d={routePath(r.pts)} className="route-dim" style={{ stroke: dayColor(r.day) }} />
        ))}
        {selected && (
          <>
            <motion.path
              key={`${selectedDay}:${selected.pts.length}`}
              className="route"
              style={{ stroke: dayColor(selectedDay) }}
              initial={{ pathLength: reduce ? 1 : 0, d: selectedD }}
              animate={{ pathLength: 1, d: selectedD }}
              transition={{ pathLength: { duration: 1.1, ease: 'easeInOut' }, d: { duration: 0.5 } }}
            />
            {!reduce && (
              <circle r="3.2" className="traveller" style={{ fill: dayColor(selectedDay) }}>
                <animateMotion dur={`${Math.max(5, selected.pts.length * 2)}s`} repeatCount="indefinite" path={selectedD} />
              </circle>
            )}
          </>
        )}
      </g>

      {placed.map((s) => {
        const p = pos.get(s.id);
        const on = s.day === selectedDay;
        const r = 4.5 + (Math.min(s.durationMin, 240) / 240) * 5.5;
        return (
          <g key={s.id} className={`star ${on ? 'is-on' : ''} ${s.id === activeId ? 'is-active' : ''}`} style={{ transform: `translate(${p.x}px, ${p.y}px)`, '--c': dayColor(s.day) }}>
            <motion.g
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 14 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <circle className="star-halo" r="17" />
              <path className="star-shape" d={STAR(r)} />
              {on && <text className="star-index" x={r + 4} y={-r + 2}>{s.index + 1}</text>}
              {onSelect && <circle className="star-hit" r="18" onClick={() => onSelect(s)} />}
            </motion.g>
          </g>
        );
      })}

      {active && (() => {
        const p = pos.get(active.id);
        const right = p.x < C;
        return (
          <text className="star-label" x={p.x + (right ? 16 : -16)} y={p.y + 4} textAnchor={right ? 'start' : 'end'}>
            {short(active.title)}
          </text>
        );
      })()}

      <circle cx={C} cy={C} r={R} className="sky-rim" />
      <g className="rim-spin">
        <circle cx={C} cy={C} r={R + 12} className="rim-minor" />
        <circle cx={C} cy={C} r={R + 12} className="rim-major" />
      </g>
      <path d={`M${C} ${C - R - 30}l-5 -11h10z`} className="north" />
      <text x={C} y={C - R - 46} textAnchor="middle" className="north-label">N</text>

      {!placed.length && !scanning && (
        <text x={C} y={C} textAnchor="middle" className="sky-empty">No coordinates to plot</text>
      )}
    </svg>
  );
}

export default memo(SkyDisc);
