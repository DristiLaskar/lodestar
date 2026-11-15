// Tiny in-memory limiter so a leaked URL can't burn through a free tier.
export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    let h = hits.get(req.ip);
    if (!h || h.reset < now) {
      h = { n: 0, reset: now + windowMs };
      hits.set(req.ip, h);
    }
    if (++h.n > max) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ error: { code: 'rate_limit', message: 'Too many requests. Wait a few seconds and try again.' } });
    }
    next();
  };
}
