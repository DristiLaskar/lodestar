import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';

const enc = new TextEncoder();
const streamOf = (text, { delay = 0 } = {}) =>
  new ReadableStream({
    async start(c) {
      for (const line of text.split('\n')) {
        if (delay) await new Promise((r) => setTimeout(r, delay));
        c.enqueue(enc.encode(`${line}\n`));
      }
      c.close();
    },
  });

const NDJSON = [
  '{"type":"trip","title":"Test trip","destination":"Nowhere","summary":"s","currency":"USD","bestFor":["x"]}',
  '{"type":"day","day":1,"title":"First"}',
  '{"type":"stop","day":1,"title":"Alpha Place","kind":"sight","time":"09:00","durationMin":60,"lat":10,"lng":10}',
  '{"type":"stop","day":1,"title":"Beta Place","kind":"food","time":"12:00","durationMin":60,"lat":10.01,"lng":10.01}',
  '{"type":"done"}',
].join('\n');

const submit = () => {
  fireEvent.change(screen.getByLabelText(/describe your trip/i), { target: { value: 'Three days somewhere nice' } });
  fireEvent.click(screen.getByRole('button', { name: /chart this trip/i }));
};

describe('App', () => {
  it('renders streamed stops as interactive UI', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, body: streamOf(NDJSON) })));
    render(<App />);
    submit();
    expect(await screen.findByText('Alpha Place')).toBeTruthy();
    expect(screen.getByText('Beta Place')).toBeTruthy();
    fireEvent.click(screen.getByText('Alpha Place'));
    expect(await screen.findByRole('button', { name: /remove/i })).toBeTruthy();
  });

  it('shows a readable error with retry when the server fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ error: { code: 'not_configured', message: 'No key' } }) })));
    render(<App />);
    submit();
    expect(await screen.findByText(/no ai key is set up/i)).toBeTruthy();
  });

  it('recovers a whole-object reply in another shape without a false "skipped" warning', async () => {
    const alt = JSON.stringify({ itinerary: [{ day: 1, label: 'Old town', activities: [{ name: 'Gamma Place', category: 'museum', start: '9am', coordinates: [1, 2] }] }] }, null, 2);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, body: streamOf(alt) })));
    render(<App />);
    submit();
    expect(await screen.findByText('Gamma Place')).toBeTruthy();
    expect(screen.queryByText(/skipped/i)).toBeNull();
  });

  it('survives an answer that is only prose', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, body: streamOf("I'm sorry, I can't help with that.") })));
    render(<App />);
    submit();
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('never lets a slow old response overwrite a newer one', async () => {
    const slow = NDJSON.replace(/Alpha Place/g, 'OLD').replace(/Beta Place/g, 'OLD2');
    const fresh = NDJSON.replace(/Alpha Place/g, 'NEW').replace(/Beta Place/g, 'NEW2');
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async (_u, { signal }) => {
      n += 1;
      if (n === 1) {
        // first request: delivers late, after being aborted by the second
        return { ok: true, body: new ReadableStream({ start(c) { setTimeout(() => { try { c.enqueue(enc.encode(slow)); c.close(); } catch { /* aborted */ } }, 150); signal.addEventListener('abort', () => { try { c.error(new DOMException('x', 'AbortError')); } catch { /* done */ } }); } }) };
      }
      return { ok: true, body: streamOf(fresh) };
    }));
    render(<App />);
    submit();
    fireEvent.click(screen.getByRole('button', { name: /start over/i }));
    expect(await screen.findByText('NEW')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 300));
    await waitFor(() => expect(screen.queryByText('OLD')).toBeNull());
  });
});
