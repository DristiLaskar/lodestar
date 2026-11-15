import { useEffect, useRef, useState } from 'react';
import { BookMarked, FlaskConical, Keyboard, Moon, Sun } from 'lucide-react';
import { CHAOS_MODES } from '../lib/chaos';
import Logo from './Logo';

export default function Header({ theme, onTheme, onHome, onLogbook, count, onHelp, lab, chaos, onChaos }) {
  const [open, setOpen] = useState(false);
  const labRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!labRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <header className="topbar">
      <button className="brand" onClick={onHome} aria-label="Lodestar, back to start">
        <Logo />
        <span>Lodestar</span>
      </button>
      <nav className="topbar-actions" aria-label="App">
        {lab && (
          <div className="lab" ref={labRef}>
            <button className={`icon-btn ${chaos !== 'ok' ? 'is-lit' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Failure lab">
              <FlaskConical size={18} />
            </button>
            {open && (
              <div className="lab-menu" role="menu">
                <p className="lab-title">Failure lab</p>
                <p className="lab-sub">Make the next request misbehave, to see how the app copes.</p>
                {CHAOS_MODES.map((m) => (
                  <button key={m.id} role="menuitemradio" aria-checked={chaos === m.id} className={`lab-item ${chaos === m.id ? 'is-on' : ''}`} onClick={() => { onChaos(m.id); setOpen(false); }}>
                    <strong>{m.label}</strong>
                    <span>{m.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button className="icon-btn has-badge" onClick={onLogbook} aria-label={`Logbook, ${count} saved`}>
          <BookMarked size={18} />
          {count > 0 && <span className="badge">{count}</span>}
        </button>
        <button className="icon-btn hide-sm" onClick={onHelp} aria-label="Keyboard shortcuts"><Keyboard size={18} /></button>
        <button className="icon-btn" onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to day chart' : 'Switch to night sky'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
    </header>
  );
}
