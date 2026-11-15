import { ApiError } from './errors';

/**
 * POST JSON and read the response body as it arrives.
 * - A watchdog aborts if no bytes arrive for `idleMs` (or `firstByteMs` at the start),
 *   so a hung model becomes a clear error instead of an endless spinner.
 * - HTTP errors become ApiError with the server's stable error code.
 * - The caller's AbortSignal cancels the request and the server stops the model call.
 */
export async function streamNdjson({ url, body, signal, chaos, onChunk, firstByteMs = 45_000, idleMs = 20_000 }) {
  const ctrl = new AbortController();
  const relay = () => ctrl.abort();
  signal.addEventListener('abort', relay);
  let timer;
  let stalled = false;
  const arm = (ms) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      stalled = true;
      ctrl.abort();
    }, ms);
  };
  const stalledError = () => new ApiError('stalled', 'No data arrived for a while.');

  try {
    arm(firstByteMs);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', ...(chaos && chaos !== 'ok' ? { 'x-chaos': chaos } : {}) },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (stalled) throw stalledError();
      if (signal.aborted) throw e;
      throw new ApiError('network', 'The request never reached the server.');
    }

    if (!res.ok) {
      let payload = null;
      try { payload = await res.json(); } catch { /* not JSON */ }
      throw new ApiError(payload?.error?.code ?? (res.status === 429 ? 'rate_limit' : 'server'), payload?.error?.message ?? `HTTP ${res.status}`, { status: res.status });
    }
    if (!res.body) throw new ApiError('server', 'The server sent an empty response.');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      let chunk;
      try {
        chunk = await reader.read();
      } catch (e) {
        if (stalled) throw stalledError();
        if (signal.aborted) throw e;
        throw new ApiError('network', 'The connection dropped mid-answer.');
      }
      if (chunk.done) break;
      arm(idleMs);
      onChunk(decoder.decode(chunk.value, { stream: true }));
    }
    onChunk(decoder.decode());
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', relay);
  }
}
