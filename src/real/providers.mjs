/**
 * Free-tier-only adapters. No arbitrary model IDs, payment toggles or automatic
 * account rotation. Confirm that each account is on an unbilled free plan.
 * Provider calls run server-side; do not bundle this module into the public PWA.
 */
export const FREE_ROUTES = Object.freeze([
  { id: 'groq-oss', provider: 'groq', model: 'openai/gpt-oss-120b', env: 'GROQ_API_KEY' },
  { id: 'gemini-flash-lite', provider: 'gemini', model: 'gemini-3.1-flash-lite', env: 'GEMINI_API_KEY' },
  { id: 'openrouter-free', provider: 'openrouter', model: 'openrouter/free', env: 'OPENROUTER_API_KEY' },
  { id: 'groq-qwen', provider: 'groq', model: 'qwen/qwen3.8-27b', env: 'GROQ_API_KEY' }
].map(route => Object.freeze(route)));

const ENDPOINTS = Object.freeze({
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent'
});

export class ProviderFailure extends Error {
  constructor(message, { status = 0, provider, retryable = false } = {}) {
    super(message);
    this.name = 'ProviderFailure';
    this.status = status;
    this.provider = provider;
    this.retryable = retryable;
  }
}

function textOf(data, provider) {
  if (provider === 'gemini') return (data?.candidates?.[0]?.content?.parts ?? []).filter(p => typeof p?.text === 'string').map(p => p.text).join('\n');
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.filter(p => typeof p?.text === 'string').map(p => p.text).join('\n');
  return '';
}

export async function requestFreeModel(route, prompt, { fetchImpl = fetch, env = process.env, timeoutMs = 25000 } = {}) {
  if (!route || !FREE_ROUTES.some(r => r.id === route.id && r.model === route.model && r.provider === route.provider && r.env === route.env)) {
    throw new ProviderFailure('Non-allowlisted model route', { provider: route.provider });
  }
  const secret = env[route.env];
  if (!secret) throw new ProviderFailure('Free-tier credential is missing', { provider: route.provider });
  if (env.SWARM_CONFIRM_FREE_TIER !== 'true') throw new ProviderFailure('Explicit free-tier account confirmation is required', { provider: route.provider });
  const gemini = route.provider === 'gemini';
  const headers = { 'content-type': 'application/json' };
  if (gemini) headers['x-goog-api-key'] = secret;
  else headers.authorization = `Bearer ${secret}`;
  const body = gemini
    ? { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 10000, responseMimeType: 'application/json' } }
    : { model: route.model, messages: [{ role: 'system', content: 'You are a safe coding assistant. Respond with only the requested JSON object.' }, { role: 'user', content: prompt }], temperature: 0.1, max_tokens: 6000 };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(ENDPOINTS[route.provider], { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok) {
      // Never log API body or headers: providers sometimes echo request metadata.
      throw new ProviderFailure(`HTTP ${response.status}`, {
        status: response.status, provider: route.provider,
        retryable: response.status === 429 || response.status === 408 || response.status >= 500
      });
    }
    const data = await response.json();
    const text = textOf(data, route.provider);
    if (!text?.trim()) throw new ProviderFailure('Empty model response', { provider: route.provider, retryable: true });
    return { text, route: route.id, provider: route.provider, model: route.model };
  } catch (err) {
    if (err instanceof ProviderFailure) throw err;
    throw new ProviderFailure(err?.name === 'AbortError' ? 'Model request timed out' : 'Model transport or response error', { provider: route.provider, retryable: true });
  } finally {
    clearTimeout(timeout);
  }
}

export async function failoverFree(prompt, { routes = FREE_ROUTES, env = process.env, fetchImpl = fetch, timeoutMs = 25000 } = {}) {
  if (env.SWARM_CONFIRM_FREE_TIER !== 'true') throw new Error('Free-tier-only execution not confirmed; stopping before all API calls.');
  const events = [];
  const providerCooldown = new Set();
  let attempted = 0;
  for (const route of routes) {
    if (providerCooldown.has(route.provider)) continue;
    if (!env[route.env]) { events.push({ route: route.id, state: 'not_configured' }); continue; }
    attempted++;
    try {
      const result = await requestFreeModel(route, prompt, { fetchImpl, env, timeoutMs });
      return { ...result, events: [...events, { route: route.id, state: 'success' }] };
    } catch (error) {
      if (!(error instanceof ProviderFailure)) throw error;
      events.push({ route: route.id, state: error.status === 429 ? 'quota_exhausted' : 'failed', status: error.status, reason: error.message });
      // Same-provider routes share account quota. Do not rotate Groq models on 429.
      if ([401, 402, 403, 408, 429, 502, 503, 504].includes(error.status)) providerCooldown.add(route.provider);
    }
  }
  const err = new Error(attempted ? 'No free provider succeeded; no code was changed.' : 'No free API keys configured; no code was changed.');
  err.events = events;
  throw err;
}
