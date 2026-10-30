# Free Agent Swarm

**A free, installable multi-agent orchestration playground with n8n workflows.**

[Try the web demo after deployment](#deploy-the-website) · [Run locally](#run-locally) · [Import n8n workflows](#n8n-workflows) · [Architecture](docs/ARCHITECTURE.md)

The v0.3 Neo-Brutalist website is an **offline-first simulation**. It transparently demonstrates what happens when Codex reaches a simulated quota and the task is handed to DeepSeek. There are **zero real API calls and zero repository modifications** from the browser. All six provider names illustrate roles, not live account integrations.

## What works now

- Distinctive Neo-Brutalist control room, responsive on mobile and desktop; no login or API key required.
- Deterministic 7-stage run simulation: accept → inspect → quota limit → handoff → implementation proposal → validation → mock PR.
- Step-through or auto-play; pause/resume; local checkpoint persistence; safe JSON export/import.
- Six-agent roster with clearly labeled **demo** quotas; click-to-inspect map and three editable mission presets.
- Installable PWA with offline static asset cache.
- Importable n8n sample with no API calls (`n8n/workflows/zero-key-simulation.json`).
- Separate **planning-only** n8n workflow with OpenRouter `openrouter/free` → Groq `openai/gpt-oss-120b` fallback for 429/503, requiring **user-supplied n8n credentials**. This generates a technical plan; it does **not** execute code or edit repositories.
- Unit tests and CI; no dependencies, payment cards, or hosted model bills.

## Run locally

Requires Node.js 20+ only for the checks and static build; the site itself needs no JS framework dependencies.

```bash
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. For a PWA, use localhost or HTTPS (Cloudflare Pages).

## Deploy the website

Cloudflare Pages → **Import existing Git repository** → select `Free-Agent-Swarm`.

- Framework preset: **None**
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`

Only the public static demo is deployed. No secrets, authentication, backend, or paid provider credentials are bundled.

## n8n workflows

1. `zero-key-simulation.json`: import and click **Execute workflow**. Safe to run with no credentials.
2. `planning-failover.json`: configure **Header Auth** credentials separately on the OpenRouter and Groq HTTP Request nodes, then configure a different **Header Auth** credential for the webhook. Activate only after confirming your account has free-tier access and setting usage limits. See [n8n setup](docs/N8N_SETUP.md).

Never paste your API keys into exported workflow JSON or the browser demo.

## Current limitations

This is an **MVP**, not an autonomous 24/7 coding service. The real n8n workflow produces planning text only. It does not connect Codex subscription sessions, Gemini Argon, Kimi subscription access, GitHub writes, MCP endpoints, job scheduling, or remote execution. Future phases require explicit permission, sandboxed runners, durable server-side state, and security reviews. The browser's localStorage checkpoint is not a shared cross-device database.

## Project values

Free to download and self-host, user-controlled credentials, explicit rate limits, no misleading quota bypass claims, draft PRs and human approval before merges, no secrets in the public repository.

Contributions welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Security notes: [SECURITY.md](SECURITY.md).

## Chosen visual direction

The owner selected Neo-Brutalism. See [design decisions, provenance and license boundaries](docs/NEOBRUTALISM_DESIGN.md). The new interface preserves the six-agent simulator, checkpoint export/import, PWA caching, and both importable n8n workflows; no live agent capability was invented.
