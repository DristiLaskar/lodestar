import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import SkyDisc from './SkyDisc';

// A looping preview of what the tool produces: stars land one by one and the
// day-1 route is drawn, then day 2. Real coordinates, so it also shows the
// kind of detail the model is asked for.
const SAMPLE = [
  { id: 'a1', day: 1, title: 'Fushimi Inari', lat: 34.9671, lng: 135.7727, durationMin: 120 },
  { id: 'a2', day: 1, title: 'Nishiki Market', lat: 35.005, lng: 135.7649, durationMin: 75 },
  { id: 'a3', day: 1, title: 'Kiyomizu-dera', lat: 34.9949, lng: 135.785, durationMin: 90 },
  { id: 'a4', day: 1, title: 'Gion at dusk', lat: 35.0037, lng: 135.7756, durationMin: 90 },
  { id: 'b1', day: 2, title: 'Bamboo Grove', lat: 35.017, lng: 135.6713, durationMin: 45 },
  { id: 'b2', day: 2, title: 'Tenryu-ji garden', lat: 35.0158, lng: 135.6742, durationMin: 75 },
  { id: 'b3', day: 2, title: 'Kinkaku-ji', lat: 35.0394, lng: 135.7292, durationMin: 60 },
  { id: 'b4', day: 2, title: 'Pontocho dinner', lat: 35.0057, lng: 135.7708, durationMin: 100 },
];

export default function HeroDisc() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? SAMPLE.length : 0);

  useEffect(() => {
    if (reduce) return undefined;
    const t = setTimeout(() => setN((k) => (k >= SAMPLE.length + 4 ? 0 : k + 1)), n === 0 ? 900 : n >= SAMPLE.length ? 700 : 760);
    return () => clearTimeout(t);
  }, [n, reduce]);

  const shown = Math.min(n, SAMPLE.length);
  const days = useMemo(
    () => [1, 2].map((day) => ({ day, stops: SAMPLE.slice(0, shown).filter((s) => s.day === day) })),
    [shown],
  );
  const last = SAMPLE[shown - 1];

  return (
    <SkyDisc
      days={days}
      frame={SAMPLE}
      selectedDay={last ? last.day : 1}
      activeId={last?.id}
      label="Preview: a three-day route being plotted across a star map"
    />
  );
}
