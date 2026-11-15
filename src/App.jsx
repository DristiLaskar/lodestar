import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import Composer from './components/Composer';
import ErrorPanel from './components/ErrorPanel';
import Header from './components/Header';
import HeroDisc from './components/HeroDisc';
import LoadingState from './components/LoadingState';
import Logbook from './components/Logbook';
import RefineBar from './components/RefineBar';
import Shortcuts from './components/Shortcuts';
import StarField from './components/StarField';
import Toast from './components/Toast';
import TripView from './components/TripView';
import { useGenerate } from './hooks/useGenerate';
import { useLogbook } from './hooks/useLogbook';
import { useTheme } from './hooks/useTheme';
import { EXAMPLES } from './lib/examples';
import { countStops, sanitizeTrip, toMarkdown } from './lib/trip';
import { initialState, reducer } from './state/tripReducer';

const LAB = import.meta.env.DEV || new URLSearchParams(window.location.search).has('lab');

export default function App() {
  const [theme, setTheme] = useTheme();
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [chaos, setChaos] = useState('ok');
  const gen = useGenerate({ stateRef, dispatch, chaos });
  const { sessions, save, remove } = useLogbook();

  const [draft, setDraft] = useState('');
  const [day, setDay] = useState(1);
  const [activeId, setActiveId] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const composerRef = useRef(null);
  const refineRef = useRef(null);

  const view = state.status === 'idle' ? 'hero' : state.status === 'loading' ? 'loading' : state.status === 'error' ? 'error' : 'trip';
  const busy = ['loading', 'streaming', 'refining'].includes(state.status);
  const say = useCallback((text, action) => setToast({ id: Date.now(), text, action }), []);
  const clearToast = useCallback(() => setToast(null), []);

  // ── actions ──
  const plan = (text) => {
    const t = text.trim();
    if (t.length < 3) return;
    setDay(1);
    setActiveId(null);
    gen.start('plan', t);
  };
  const retry = () => gen.start('plan', state.prompt);
  const goHome = () => { gen.cancel(); dispatch({ type: 'RESET' }); };
  const fillDay = useCallback((d) => setPrefill({ n: Date.now(), text: `Fill day ${d} with a few stops that suit the rest of the trip` }), []);

  const openSession = (s) => {
    const r = sanitizeTrip(s.trip);
    setLogOpen(false);
    if (!r) { remove(s.id); say('That saved trip was damaged, so it was removed.'); return; }
    gen.cancel();
    dispatch({ type: 'LOAD', trip: r.trip, seq: r.seq, prompt: s.prompt, sessionId: s.id });
    setDraft(s.prompt);
    setDay(r.trip.days[0].day);
    setActiveId(null);
  };

  const copyText = async () => {
    try { await navigator.clipboard.writeText(toMarkdown(state.trip)); say('Itinerary copied as text.'); } catch { say('Copy was blocked by the browser.'); }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify({ prompt: state.prompt, trip: state.trip }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${(state.trip.meta?.title || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── effects ──
  useEffect(() => { document.title = state.trip?.meta?.title ? `${state.trip.meta.title} · Lodestar` : 'Lodestar'; }, [state.trip?.meta?.title]);

  // Auto-save to the logbook once a run has settled.
  useEffect(() => {
    if (state.status !== 'ready' || !state.sessionId || !countStops(state.trip)) return undefined;
    const t = setTimeout(() => save({ id: state.sessionId, prompt: state.prompt, updatedAt: Date.now(), trip: state.trip }), 500);
    return () => clearTimeout(t);
  }, [state.status, state.trip, state.sessionId, state.prompt, save]);

  useEffect(() => {
    if (state.removed) say(`Removed “${state.removed.stop.title}”.`, { label: 'Undo', run: () => dispatch({ type: 'UNDO_REMOVE' }) });
  }, [state.removed, say]);

  useEffect(() => {
    if (state.note && state.status === 'ready') say(state.note, { label: 'Undo', run: () => dispatch({ type: 'UNDO_REFINE' }) });
  }, [state.note, state.status, say]);

  useEffect(() => {
    if (!state.pulse.length || state.status === 'refining') return undefined;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_PULSE' }), 2800);
    return () => clearTimeout(t);
  }, [state.pulse, state.status]);

  // Keep the selected day valid as days appear or disappear.
  const days = state.trip?.days ?? [];
  const currentDay = days.some((d) => d.day === day) ? day : days[0]?.day ?? 1;

  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      if (e.key === 'Escape') { setLogOpen(false); setHelpOpen(false); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); (view === 'trip' ? refineRef : composerRef).current?.focus(); }
      else if (e.key === '?') setHelpOpen((o) => !o);
      else if ((e.key === '[' || e.key === ']') && view === 'trip' && days.length > 1) {
        const nums = days.map((d) => d.day);
        const i = nums.indexOf(currentDay);
        setDay(nums[(i + (e.key === ']' ? 1 : -1) + nums.length) % nums.length]);
        setActiveId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, days, currentDay]);

  const isHero = view === 'hero';

  return (
    <MotionConfig reducedMotion="user">
      <StarField />
      <div className="app">
        <Header theme={theme} onTheme={setTheme} onHome={goHome} onLogbook={() => setLogOpen(true)} count={sessions.length} onHelp={() => setHelpOpen(true)} lab={LAB} chaos={chaos} onChaos={setChaos} />

        <main className={`stage is-${view}`}>
          <section className={isHero ? 'hero' : 'compose-slot'}>
            <div className="hero-copy">
              {isHero && <h1 className="hero-title">Plan the trip in your own words</h1>}
              {isHero && <p className="hero-lede">Lodestar turns a sentence into a day-by-day route you can reorder, trim and refine, and plots every stop on a star map.</p>}
              <Composer value={draft} onChange={setDraft} onSubmit={plan} onCancel={gen.cancel} busy={busy} compact={!isHero} inputRef={composerRef} />
              {isHero && (
                <div className="examples">
                  <span>Try one:</span>
                  {EXAMPLES.map((ex) => (
                    <button key={ex.label} className="chip-btn" onClick={() => { setDraft(ex.prompt); composerRef.current?.focus(); }}>{ex.label}</button>
                  ))}
                </div>
              )}
            </div>
            {isHero && <div className="hero-disc"><HeroDisc /></div>}
          </section>

          {view === 'loading' && <LoadingState hasMeta={Boolean(state.trip?.meta)} onCancel={gen.cancel} />}
          {view === 'error' && <ErrorPanel error={state.error} onRetry={retry} onEdit={() => { dispatch({ type: 'RESET' }); setTimeout(() => composerRef.current?.focus(), 0); }} />}
          {view === 'trip' && (
            <TripView
              state={state}
              dispatch={dispatch}
              day={currentDay}
              setDay={setDay}
              activeId={activeId}
              setActiveId={setActiveId}
              onRetry={retry}
              onFillDay={fillDay}
              onCopy={copyText}
              onDownload={download}
              onNew={goHome}
            />
          )}
        </main>

        {view === 'trip' && (
          <RefineBar
            inputRef={refineRef}
            prefill={prefill}
            busy={state.status === 'refining'}
            disabled={state.status === 'streaming'}
            canUndo={Boolean(state.snapshot) && state.status === 'ready'}
            onUndo={() => dispatch({ type: 'UNDO_REFINE' })}
            onSubmit={(text) => gen.start('refine', text)}
          />
        )}
      </div>

      <Logbook open={logOpen} sessions={sessions} currentId={state.sessionId} onClose={() => setLogOpen(false)} onOpen={openSession} onDelete={remove} />
      <Shortcuts open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Toast toast={toast} onDone={clearToast} />
    </MotionConfig>
  );
}
