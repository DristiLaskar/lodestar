import { describe, expect, it } from 'vitest';
import { createNdjsonParser, repair } from '../lib/ndjson';

const run = (chunks) => {
  const objs = [];
  const bad = [];
  const p = createNdjsonParser({ onObject: (o) => objs.push(o), onBad: (b) => bad.push(b) });
  chunks.forEach((c) => p.push(c));
  p.flush();
  return { objs, bad, p };
};

describe('ndjson parser', () => {
  it('reassembles lines split across chunks', () => {
    const { objs } = run(['{"type":"sto', 'p","title":"A"}\n{"type":"do', 'ne"}\n']);
    expect(objs.map((o) => o.type)).toEqual(['stop', 'done']);
  });

  it('ignores prose and code fences around the JSON', () => {
    const { objs, bad } = run(["Sure! Here you go:\n```json\n", '{"type":"trip","title":"T"}\n', '```\nHope that helps\n']);
    expect(objs).toHaveLength(1);
    expect(bad).toHaveLength(0);
  });

  it('splits two objects glued on one line', () => {
    const { objs } = run(['{"type":"day","day":1}{"type":"day","day":2}\n']);
    expect(objs).toHaveLength(2);
  });

  it('repairs trailing commas, bare keys and Python literals', () => {
    expect(JSON.parse(repair('{"a":1,}'))).toEqual({ a: 1 });
    expect(JSON.parse(repair('{type:"stop",title:"A",cost:None}'))).toEqual({ type: 'stop', title: 'A', cost: null });
  });

  it('reports an unrecoverable line but keeps going', () => {
    const { objs, bad } = run(['{"type":"stop","title":"broken"\n', '{"type":"stop","title":"fine"}\n']);
    expect(objs.map((o) => o.title)).toEqual(['fine']);
    expect(bad).toHaveLength(1);
  });

  it('joins a pretty-printed object over several lines', () => {
    const { objs } = run(['{\n  "type": "trip",\n  "title": "X"\n}\n']);
    expect(objs[0]).toMatchObject({ type: 'trip', title: 'X' });
  });
});
