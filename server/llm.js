// Streams text deltas from any OpenAI-compatible /chat/completions endpoint.
// Yields plain strings. Throws UpstreamError with a stable `code` the client
// understands (auth, rate_limit, timeout, upstream_error).
export class UpstreamError extends Error {
  constructor(message, { status = 502, code = 'upstream_error' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function extractMessage(text) {
  try {
    const j = JSON.parse(text);
    return (j?.error?.message ?? j?.[0]?.error?.message ?? '').toString().slice(0, 240);
  } catch {
    return text.slice(0, 160);
  }
}

function mapStatus(status, detail) {
  if (status === 401 || status === 403) {
    return new UpstreamError(`The AI provider rejected the API key. ${detail}`.trim(), { status: 502, code: 'auth' });
  }
  if (status === 429) {
    return new UpstreamError(`The AI provider is rate limiting this key. ${detail}`.trim(), { status: 429, code: 'rate_limit' });
  }
  return new UpstreamError(`The AI provider returned ${status}. ${detail}`.trim(), { status: 502, code: 'upstream_error' });
}

function asUpstream(e, ctrl) {
  const reason = ctrl.signal.reason;
  if (reason instanceof UpstreamError) return reason; // our own timeout fired
  if (ctrl.signal.aborted) return e; // the browser went away
  return new UpstreamError(`Could not reach the AI provider (${e?.cause?.code ?? e?.message}).`);
}

export async function* streamCompletion({
  config,
  messages,
  signal,
  temperature = 0.7,
  maxTokens = 6000,
  firstTokenMs = 40_000,
  idleMs = 25_000,
}) {
  const ctrl = new AbortController();
  const relay = () => ctrl.abort(signal.reason);
  signal.addEventListener('abort', relay);

  let timer;
  const arm = (ms, msg) => {
    clearTimeout(timer);
    timer = setTimeout(() => ctrl.abort(new UpstreamError(msg, { status: 504, code: 'timeout' })), ms);
  };

  try {
    arm(firstTokenMs, 'The AI provider took too long to start answering.');
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    let res;
    try {
      res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers,
        body: JSON.stringify({ model: config.model, messages, stream: true, temperature, max_tokens: maxTokens }),
      });
    } catch (e) {
      throw asUpstream(e, ctrl);
    }
    if (!res.ok) throw mapStatus(res.status, extractMessage(await res.text().catch(() => '')));

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      let r;
      try {
        r = await reader.read();
      } catch (e) {
        throw asUpstream(e, ctrl);
      }
      if (r.done) return;
      arm(idleMs, 'The AI provider stopped answering mid-way.');
      buf += decoder.decode(r.value, { stream: true });

      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        if (json.error) throw new UpstreamError(json.error.message ?? 'The AI provider reported an error.');
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', relay);
  }
}
