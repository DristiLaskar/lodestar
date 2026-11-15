import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getProviderConfig, isConfigured } from './provider.js';
import { streamCompletion, UpstreamError } from './llm.js';
import { planMessages, refineMessages } from './prompts.js';
import { streamMock, CHAOS_MODES } from './chaos.js';
import { rateLimit } from './rateLimit.js';

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 8787;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } });

app.get('/api/health', (_req, res) => {
  const c = getProviderConfig();
  res.json({ ok: true, provider: c.name, model: c.model, configured: isConfigured(c), mock: c.mock, lab: !isProd });
});

// ── input validation: never trust the browser ──────────────────────────────
function validatePlan(req, res, next) {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (prompt.length < 3) return fail(res, 400, 'bad_request', 'Describe the trip in a few words.');
  if (prompt.length > 1200) return fail(res, 400, 'bad_request', 'That description is too long. Keep it under 1,200 characters.');
  req.llmMessages = planMessages(prompt);
  next();
}

function validateRefine(req, res, next) {
  const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim() : '';
  const trip = req.body?.trip;
  if (instruction.length < 2 || instruction.length > 600) return fail(res, 400, 'bad_request', 'Describe the change in 2 to 600 characters.');
  if (!trip || !Array.isArray(trip.stops) || trip.stops.length > 80) return fail(res, 400, 'bad_request', 'The itinerary to edit is missing or too large.');
  req.llmMessages = refineMessages(instruction, trip);
  next();
}

// ── streaming handler ──────────────────────────────────────────────────────
// Headers are only sent once the first chunk exists, so failures that happen
// before any output are real HTTP errors. Failures after that point are
// reported in-band as a final {"type":"error"} line.
function streamHandler(kind) {
  return async (req, res) => {
    const cfg = getProviderConfig();
    const header = req.get('x-chaos');
    const chaos = !isProd && CHAOS_MODES.includes(header) && header !== 'ok' ? header : null;

    if (!chaos && !isConfigured(cfg)) {
      return fail(res, 503, 'not_configured', 'No AI provider is configured on the server. Copy .env.example to .env and add your API key.');
    }

    const ac = new AbortController();
    res.on('close', () => { if (!res.writableEnded) ac.abort(); });

    const source = chaos || cfg.mock
      ? streamMock({ kind, mode: chaos ?? 'ok', signal: ac.signal })
      : streamCompletion({ config: cfg, messages: req.llmMessages, signal: ac.signal });

    let started = false;
    try {
      for await (const chunk of source) {
        if (ac.signal.aborted) break;
        if (!started) {
          started = true;
          res.status(200).set({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
          res.flushHeaders();
        }
        res.write(chunk);
      }
      if (!started && !res.headersSent) res.status(200).type('application/x-ndjson');
      res.end();
    } catch (err) {
      if (ac.signal.aborted) return res.end();
      const e = err instanceof UpstreamError ? err : new UpstreamError('Unexpected server error.', { status: 500, code: 'server' });
      if (!(err instanceof UpstreamError)) console.error(err);
      if (!started) return fail(res, e.status, e.code, e.message);
      res.write(`\n${JSON.stringify({ type: 'error', code: e.code, message: e.message })}\n`);
      res.end();
    }
  };
}

const limit = rateLimit({ max: Number(process.env.RATE_LIMIT_PER_MIN) || 20 });
app.post('/api/plan', limit, validatePlan, streamHandler('plan'));
app.post('/api/refine', limit, validateRefine, streamHandler('refine'));
app.use('/api', (_req, res) => fail(res, 404, 'not_found', 'Unknown API route.'));

// ── production: serve the built UI from the same origin ────────────────────
const dist = path.resolve(__dirname, '../dist');
if (isProd && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// body-parser errors (bad JSON, too large) → friendly JSON, not an HTML stack
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') return fail(res, 413, 'bad_request', 'That request is too large.');
  if (err?.type === 'entity.parse.failed') return fail(res, 400, 'bad_request', 'Malformed request body.');
  console.error(err);
  fail(res, 500, 'server', 'Unexpected server error.');
});

app.listen(PORT, () => {
  const c = getProviderConfig();
  const mode = c.mock ? 'MOCK (canned demo data)' : isConfigured(c) ? `${c.name} / ${c.model}` : 'NOT CONFIGURED (add a key to .env)';
  console.log(`\n  Lodestar API  http://localhost:${PORT}\n  Model         ${mode}${isProd ? '' : '\n  Failure lab   enabled (dev only)'}\n`);
});
