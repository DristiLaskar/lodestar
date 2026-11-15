// Every failure the app can hit, in plain language, with what to do about it.
export class ApiError extends Error {
  constructor(code, message, { status, details } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const COPY = {
  network: { title: "Can't reach the Lodestar server", hint: 'Check that `npm start` is still running, then retry.' },
  stalled: { title: 'The model stopped responding', hint: 'It went quiet partway through. Retry, or try a shorter request.' },
  timeout: { title: 'The model took too long', hint: 'The provider was slow to start. Retry in a moment.' },
  not_configured: { title: 'No AI key is set up yet', hint: 'Copy .env.example to .env, add your API key, and restart the server.' },
  auth: { title: 'The AI provider rejected the key', hint: 'Check AI_API_KEY and AI_PROVIDER in .env, then restart the server.' },
  rate_limit: { title: 'Too many requests', hint: 'Free tiers have per-minute limits. Wait about 30 seconds and retry.' },
  upstream_error: { title: 'The AI provider had a problem', hint: 'This is on the provider’s side. Retry in a moment.' },
  bad_request: { title: 'That request was not accepted', hint: 'Adjust the text and try again.' },
  empty: { title: 'The model returned nothing usable', hint: 'Try again, or add a destination and a few preferences.' },
  malformed: { title: 'The answer was not in a readable shape', hint: 'The model replied, but none of it could be turned into stops. Retry usually fixes it.' },
  unclear: { title: 'That does not look like a trip yet', hint: 'Mention where you want to go, for how long, and what you enjoy.' },
  cannot_edit: { title: 'That change could not be made', hint: 'Try describing it in terms of days and stops.' },
  server: { title: 'Something broke on the server', hint: 'Check the terminal running the server for details.' },
};

export function describeError(err) {
  const code = err instanceof ApiError ? err.code : 'server';
  const copy = COPY[code] ?? COPY.server;
  return {
    code,
    title: copy.title,
    hint: copy.hint,
    message: err instanceof ApiError && err.message && !['empty', 'malformed'].includes(code) ? err.message : '',
    details: err instanceof ApiError ? err.details : undefined,
    retryable: !['not_configured', 'auth', 'unclear', 'bad_request'].includes(code),
  };
}
