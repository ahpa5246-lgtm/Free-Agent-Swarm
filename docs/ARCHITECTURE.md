# Architecture and roadmap

## Current boundaries

```text
Static PWA (public) ── Browser-only simulation ── localStorage checkpoint

n8n instance (self-hosted, separate from website)
  ├─ Manual trigger → mock handoff output (no keys)
  └─ Authenticated webhook → input validation → OpenRouter free model
                                            ├─ usable plan → response
                                            └─ 429/503 → Groq backup → response
```

The two systems are **deliberately not coupled** in v0.1. This avoids embedding user API keys in public frontend JavaScript, exposing a private webhook, or promising that a public browser simulation modified GitHub.

## Planned coding service (NOT included)

A future real coding mode would need an authenticated GitHub App, strict repository allowlists, independent sandboxed ephemeral runners, per-user quotas, webhook signatures, durable checkpoints in a database, test evidence, review-gated draft PRs, and a job coordinator. Each provider adapter must use a supported API or authorized local model runner; MCP is an interface to tools, not a free model entitlement.

## State machine

`queued → running → quota_hit → handoff → proposal → validation → complete`.

No hard-coded provider web UI automation or credential sharing. If all providers are unavailable, return `blocked` and retain the checkpoint; do not spin forever.

## Public hosting

Cloudflare Pages can serve static frontend assets at no model inference cost. **Each** self-hosted n8n user supplies their own execution environment. We do not operate a shared hosted n8n workflow-builder; evaluate n8n Sustainable Use License before any hosted commercial/product offering.

## Product roadmap

1. Public PWA demo, downloadable workflows, import/export and tests **(this PR)**.
2. Accessible localization (English/Arabic), realistic replay datasets, e2e UI coverage.
3. Authenticated job API with persistent server-side checkpoints and controlled quotas.
4. GitHub App for strictly scoped draft PR creation + CI gates + reviewer approval.
5. Optional native packaging and self-hosted open-model runner.
