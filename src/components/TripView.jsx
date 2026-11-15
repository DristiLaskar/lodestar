import { useMemo, useState } from 'react';
import Banner from './Banner';
import DayTabs from './DayTabs';
import DayView from './DayView';
import Extras from './Extras';
import SkyDisc from './SkyDisc';
import TripHeader from './TripHeader';
import { MAX_DAYS } from '../lib/schema';
import { allStops, dayStats, tripStats } from '../lib/trip';
import { dayColor, fmtKm } from '../lib/format';

export default function TripView({ state, dispatch, day, setDay, activeId, setActiveId, onRetry, onFillDay, onCopy, onDownload, onNew }) {
  const { trip } = state;
  const [openIds, setOpen] = useState(() => new Set());
  const streaming = state.status === 'streaming';
  const current = trip.days.find((d) => d.day === day) ?? trip.days[0];
  const maxDay = trip.days.reduce((m, d) => Math.max(m, d.day), 0);
  const dayOptions = useMemo(() => [...trip.days.map((d) => d.day), ...(maxDay < MAX_DAYS ? [maxDay + 1] : [])], [trip.days, maxDay]);
  const stats = useMemo(() => tripStats(trip), [trip]);
  const unplaced = allStops(trip).filter((s) => s.lat == null).length;
  const dayInfo = current ? dayStats(current) : null;

  const handlers = useMemo(() => ({
    onToggle: (id) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    onActive: setActiveId,
    onRemove: (id) => dispatch({ type: 'REMOVE_STOP', id }),
    onReorder: (d, stops) => dispatch({ type: 'REORDER_DAY', day: d, stops }),
    onNudge: (id, dir) => {
      dispatch({ type: 'NUDGE', id, dir });
      requestAnimationFrame(() => document.querySelector(`#stop-${id} [data-stop-main]`)?.focus());
    },
    onMoveDay: (id, d) => { dispatch({ type: 'MOVE_STOP_DAY', id, day: d }); setDay(d); setActiveId(id); },
    onFillDay,
  }), [dispatch, setActiveId, setDay, onFillDay]);

  const selectFromMap = (s) => {
    setDay(s.day);
    setActiveId(s.id);
    setOpen((prev) => new Set(prev).add(s.id));
    setTimeout(() => document.getElementById(`stop-${s.id}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 80);
  };

  const b = state.banner;
  return (
    <div className="trip">
      <TripHeader meta={trip.meta} stats={stats} streaming={streaming || state.status === 'refining'} onCopy={onCopy} onDownload={onDownload} onNew={onNew} />

      <div className="banners">
        {b && (
          <Banner kind={b.kind} title={b.title} onRetry={b.scope === 'plan' && b.retryable !== false ? onRetry : undefined} onDismiss={() => dispatch({ type: 'DISMISS_BANNER' })}>
            {b.partial && b.kind === 'error' ? 'Kept what had arrived. ' : ''}{b.hint} {b.message}
          </Banner>
        )}
        {!b && state.truncated && (
          <Banner title="The model stopped early." onRetry={onRetry} onDismiss={() => dispatch({ type: 'DISMISS_BANNER' })}>
            You have the stops it finished. Retry for a complete itinerary, or keep editing this one.
          </Banner>
        )}
        {state.skipped > 0 && state.status === 'ready' && (
          <Banner kind="info" title={`${state.skipped} ${state.skipped === 1 ? 'item' : 'items'} skipped.`} onDismiss={() => dispatch({ type: 'DISMISS_BANNER' })}>
            The model sent {state.skipped === 1 ? 'something' : 'things'} that could not be read, so everything else was kept.
          </Banner>
        )}
      </div>

      <div className="tripgrid">
        <div className="tripgrid-map">
          <div className="mapcard">
            <SkyDisc days={trip.days} frame={allStops(trip)} selectedDay={current?.day} activeId={activeId} onSelect={selectFromMap} scanning={streaming && allStops(trip).length === 0} />
            {current && dayInfo && (
              <p className="mapcap" style={{ '--c': dayColor(current.day) }}>
                <i /> Day {current.day}: {dayInfo.stops} {dayInfo.stops === 1 ? 'star' : 'stars'}{dayInfo.km > 0 ? `, ${fmtKm(dayInfo.km)} km of route` : ''}
                {unplaced > 0 && <span className="mapcap-note">{unplaced} {unplaced === 1 ? 'stop has' : 'stops have'} no coordinates and {unplaced === 1 ? 'is' : 'are'} not plotted.</span>}
              </p>
            )}
          </div>
        </div>

        <div className="tripgrid-main">
          <DayTabs days={trip.days} value={current?.day} onChange={(d) => { setDay(d); setActiveId(null); }} />
          {current && (
            <DayView day={current} dayOptions={dayOptions} currency={trip.meta?.currency} openIds={openIds} activeId={activeId} pulse={state.pulse} streaming={streaming && current.day === maxDay} handlers={handlers} />
          )}
        </div>

        <div className="tripgrid-notes">
          <Extras trip={trip} />
        </div>
      </div>
    </div>
  );
}
