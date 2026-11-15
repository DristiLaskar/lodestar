// One OpenAI-compatible client covers every provider below. Switching is a
// matter of changing AI_PROVIDER (or AI_BASE_URL / AI_MODEL) in .env.
const PRESETS = {
  groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3.1', keyOptional: true },
};

export function getProviderConfig(env = process.env) {
  const name = (env.AI_PROVIDER || 'groq').toLowerCase();
  const preset = PRESETS[name] || {};
  return {
    name,
    baseUrl: (env.AI_BASE_URL || preset.baseUrl || '').replace(/\/$/, ''),
    model: env.AI_MODEL || preset.model || '',
    apiKey: env.AI_API_KEY || '',
    keyOptional: Boolean(preset.keyOptional),
    mock: env.AI_MOCK === 'true',
  };
}

export const isConfigured = (c) => c.mock || Boolean(c.baseUrl && c.model && (c.apiKey || c.keyOptional));
