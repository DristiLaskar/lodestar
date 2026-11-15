import { describe, expect, it } from 'vitest';
import { extractJson, ingest, normalizeStop, parseTime, wholeToLines } from '../lib/schema';

describe('normalizeStop', () => {
  it('coerces messy values', () => {
    const s = normalizeStop({ name: 'Temple', category: 'Temple', start: '2:30 PM', duration: '1.5 hours', cost: '¥1,200', lat: '34.9', lng: '135.7', day: 'Day 2' });
    expect(s).toMatchObject({ title: 'Temple', kind: 'culture', time: '14:30', durationMin: 90, costEstimate: 1200, lat: 34.9, lng: 135.7, day: 2 });
  });
  it('drops impossible coordinates but keeps the stop', () => {
    const s = normalizeStop({ title: 'X', lat: 999, lng: 10 });
    expect(s.lat).toBeNull();
    expect(s.lng).toBeNull();
  });
  it('rejects a stop without a title', () => {
    expect(normalizeStop({ kind: 'food' })).toBeNull();
  });
  it('clamps absurd durations', () => {
    expect(normalizeStop({ title: 'X', durationMin: 99999 }).durationMin).toBe(720);
    expect(normalizeStop({ title: 'X', kind: 'food', durationMin: -5 }).durationMin).toBe(75);
  });
});

describe('time parsing', () => {
  it.each([['9am', '09:00'], ['9:05 PM', '21:05'], ['12 AM', '00:00'], ['07:30', '07:30'], ['25:00', null], ['soon', null]])('%s', (i, o) => expect(parseTime(i)).toBe(o));
});

describe('ingest', () => {
  it('marks unusable objects as skip', () => {
    expect(ingest({ type: 'stop' }).kind).toBe('skip');
    expect(ingest({ type: 'mystery' }).kind).toBe('skip');
  });
  it('uses the current day when a stop omits it', () => {
    expect(ingest({ type: 'stop', title: 'A' }, { day: 3 }).data.day).toBe(3);
  });
});

describe('whole-object fallback', () => {
  it('turns an alternate shape into lines', () => {
    const value = extractJson('Here:\n```json\n{"itinerary":[{"day":1,"label":"Old","activities":[{"name":"A","coordinates":[1,2]}]}]}\n```');
    const lines = wholeToLines(value);
    const stop = ingest(lines.find((l) => l.type === 'stop'));
    expect(stop.kind).toBe('stop');
    expect(stop.data).toMatchObject({ title: 'A', lat: 1, lng: 2, day: 1 });
  });
});
