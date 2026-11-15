import { memo } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import { ArrowDown, ArrowUp, Clock, Coins, GripVertical, Lightbulb, Trash2 } from 'lucide-react';
import { KIND_META } from './kinds';
import { fmtDuration, fmtKm, fmtMoney } from '../lib/format';
import { phaseOf } from '../lib/trip';

const MODE = { walk: 'on foot', transit: 'by transit', drive: 'by car' };

function StopRow({ stop, index, total, color, expanded, active, fresh, leg, currency, dayOptions, onToggle, onActive, onRemove, onNudge, onMoveDay }) {
  const controls = useDragControls();
  const { Icon, label } = { Icon: (KIND_META[stop.kind] ?? KIND_META.sight).Icon, label: (KIND_META[stop.kind] ?? KIND_META.sight).label };
  const bodyId = `stop-body-${stop.id}`;

  const onKeyDown = (e) => {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      onNudge(stop.id, e.key === 'ArrowUp' ? -1 : 1);
    } else if (!e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.target.matches('[data-stop-main]')) {
      e.preventDefault();
      const mains = [...e.currentTarget.parentElement.querySelectorAll('[data-stop-main]')];
      mains[mains.indexOf(e.target) + (e.key === 'ArrowUp' ? -1 : 1)]?.focus();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.matches('[data-stop-main]')) {
      e.preventDefault();
      onRemove(stop.id);
    }
  };

  return (
    <Reorder.Item
      as="li"
      value={stop}
      id={`stop-${stop.id}`}
      dragListener={false}
      dragControls={controls}
      className={`stop phase-${phaseOf(stop.time)} ${expanded ? 'is-open' : ''} ${active ? 'is-active' : ''} ${fresh ? 'is-fresh' : ''}`}
      style={{ '--c': color }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -36, transition: { duration: 0.18 } }}
      whileDrag={{ scale: 1.015, zIndex: 20 }}
      onKeyDown={onKeyDown}
      onMouseEnter={() => onActive(stop.id)}
      onFocus={() => onActive(stop.id)}
    >
      <div className="stop-time">{stop.time ?? '--:--'}</div>

      <div className="stop-rail" aria-hidden="true">
        <span className="stop-node">{index + 1}</span>
      </div>

      <div className="stop-content">
        <div className="stop-head">
          <button type="button" className="stop-main" data-stop-main aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
            <span className="stop-title">{stop.title}</span>
            <span className="stop-meta">
              <span className="chip kind"><Icon size={13} /> {label}</span>
              {stop.area && <span className="stop-area">{stop.area}</span>}
              <span className="chip"><Clock size={12} /> {fmtDuration(stop.durationMin)}</span>
              {stop.costEstimate != null && <span className="chip"><Coins size={12} /> {stop.costEstimate === 0 ? 'Free' : fmtMoney(stop.costEstimate, currency)}</span>}
            </span>
          </button>
          <button
            type="button"
            className="grip"
            aria-label={`Reorder ${stop.title}. Drag, or use Alt with the arrow keys.`}
            onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
          >
            <GripVertical size={18} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div id={bodyId} className="stop-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: [0.3, 0.7, 0.2, 1] }}>
              <div className="stop-body-inner">
                {stop.description && <p>{stop.description}</p>}
                {stop.tip && <p className="stop-tip"><Lightbulb size={15} /> {stop.tip}</p>}
                <div className="stop-tools">
                  <button className="btn small" onClick={() => onNudge(stop.id, -1)} disabled={index === 0}><ArrowUp size={14} /> Earlier</button>
                  <button className="btn small" onClick={() => onNudge(stop.id, 1)} disabled={index === total - 1}><ArrowDown size={14} /> Later</button>
                  <label className="select-wrap">
                    <span className="sr-only">Move to day</span>
                    <select value={stop.day} onChange={(e) => onMoveDay(stop.id, Number(e.target.value))}>
                      {dayOptions.map((d) => <option key={d} value={d}>{d === stop.day ? `Day ${d}` : `Move to day ${d}`}</option>)}
                    </select>
                  </label>
                  <button className="btn small danger" onClick={() => onRemove(stop.id)}><Trash2 size={14} /> Remove</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {leg && (
          <div className="stop-leg" aria-label="Travel to the next stop">
            <span>About {fmtKm(leg.km)} km, {leg.min} min {MODE[leg.mode]}</span>
          </div>
        )}
      </div>
    </Reorder.Item>
  );
}

export default memo(StopRow);
