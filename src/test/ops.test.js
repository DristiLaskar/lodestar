import { describe, expect, it } from 'vitest';
import { reducer, initialState } from '../state/tripReducer';
import { applyOp } from '../lib/ops';

const stop = (title, day = 1) => ({ type: 'LINE_STOP', stop: { day, title, kind: 'sight', time: '09:00', durationMin: 60, area: '', description: '', tip: '', costEstimate: null, lat: 1, lng: 1 } });
const build = () => [{ type: 'RUN_START', mode: 'plan', prompt: 'x', sessionId: 'a' }, { type: 'LINE_DAY', day: 1, title: 'One' }, stop('A'), stop('B'), stop('C', 2)].reduce(reducer, initialState);

describe('applyOp', () => {
  const { trip, seq } = build();
  it('adds after a given stop', () => {
    const r = applyOp(trip, { op: 'add_stop', day: 1, afterId: 's1', stop: { title: 'New' } }, seq);
    expect(r.trip.days[0].stops.map((s) => s.title)).toEqual(['A', 'New', 'B']);
  });
  it('rejects unknown ids and bad days', () => {
    expect(applyOp(trip, { op: 'remove_stop', id: 'nope' }, seq)).toBeNull();
    expect(applyOp(trip, { op: 'add_stop', day: 7, stop: { title: 'X' } }, seq)).toBeNull();
  });
  it('allows creating exactly the next day', () => {
    const r = applyOp(trip, { op: 'add_stop', day: 3, stop: { title: 'X' } }, seq);
    expect(r.trip.days.map((d) => d.day)).toEqual([1, 2, 3]);
  });
  it('moves a stop between days', () => {
    const r = applyOp(trip, { op: 'move_stop', id: 's1', day: 2, afterId: null }, seq);
    expect(r.trip.days[1].stops.map((s) => s.title)).toEqual(['A', 'C']);
  });
  it('refuses an update that would blank the title', () => {
    expect(applyOp(trip, { op: 'update_stop', id: 's1', changes: { title: '' } }, seq)).toBeNull();
  });
});

describe('reducer', () => {
  it('rolls a failed refine back to the snapshot', () => {
    let s = build();
    s = reducer(s, { type: 'RUN_DONE', truncated: false });
    s = reducer(s, { type: 'RUN_START', mode: 'refine' });
    s = reducer(s, { type: 'LINE_OP', op: { op: 'remove_stop', id: 's1' } });
    expect(s.trip.days[0].stops).toHaveLength(1);
    s = reducer(s, { type: 'RUN_FAIL', error: { title: 'x' } });
    expect(s.trip.days[0].stops).toHaveLength(2);
    expect(s.banner.scope).toBe('refine');
  });
  it('keeps partial results when a plan fails midway', () => {
    const s = reducer(build(), { type: 'RUN_FAIL', error: { title: 'stalled' } });
    expect(s.status).toBe('ready');
    expect(s.banner.partial).toBe(true);
  });
  it('shows the error screen when nothing arrived', () => {
    const s = reducer(reducer(initialState, { type: 'RUN_START', mode: 'plan', prompt: 'x', sessionId: 'a' }), { type: 'RUN_FAIL', error: { title: 'boom' } });
    expect(s.status).toBe('error');
  });
  it('undoes a removal at the same position', () => {
    let s = build();
    s = reducer(s, { type: 'REMOVE_STOP', id: 's1' });
    s = reducer(s, { type: 'UNDO_REMOVE' });
    expect(s.trip.days[0].stops.map((x) => x.title)).toEqual(['A', 'B']);
  });
  it('ignores a reorder that changes the set of stops', () => {
    const s = build();
    const bad = reducer(s, { type: 'REORDER_DAY', day: 1, stops: [s.trip.days[0].stops[0]] });
    expect(bad).toBe(s);
  });
});
