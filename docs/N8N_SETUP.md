# n8n setup (v0.1)

Two workflows are included in [`n8n/workflows`](../n8n/workflows).

## A. Zero-key workflow (works completely offline)

1. Start your own n8n instance. Open **Workflows** → **Import from File**.
2. Select `zero-key-simulation.json`.
3. Select **Execute workflow** and inspect the seven events returned by **Simulate Handoff**.
4. Nothing is sent to AI services, GitHub, or this project's website.

## B. Planning-only provider failover (optional)

The `planning-failover.json` sample **calls model APIs**. It is **disabled by default** and intentionally contains no credentials or API keys.

1. Import `planning-failover.json` into your own n8n instance.
2. Create three separate n8n **Header Auth credentials**:
   - `OpenRouter`: `Authorization` header value `Bearer YOUR_OPENROUTER_API_KEY`.
   - `Groq`: `Authorization` header value `Bearer YOUR_GROQ_API_KEY`.
   - `Webhook`: a strong, unique `X-Swarm-Key` header value.
3. Select the correct credential on the **Task Webhook**, **OpenRouter Free**, and **Groq Backup** nodes. **Never share or publish these credentials.**
4. Confirm both selected model IDs are supported, free for your account, and permitted by current provider terms. **Some models/free tiers can change**. Groq may require a payment method depending on your account and region; if so, do not enable it under a zero-cost policy.
5. Test with **Test URL**, then activate and use the **Production URL** only if you intend to expose an endpoint. Apply network allowlists / a reverse proxy rate limiter. Use server-to-server requests; **do not call this private authenticated webhook directly from a public web page**.
6. POST `{"task":"Describe a safe refactor plan for a small CLI", "repository":"example/cli"}` with your webhook authentication header. On a successful response, inspect `mode: planning-only` and `provider`.

A successful response includes a **plan**; it does not prove code changes, tests or PR creation. On OpenRouter 429/503, the workflow makes **one** authorized backup attempt through Groq. It never rotates accounts, purchases credits or attempts quota bypasses. A 401/402/403 should block the run. Use the n8n execution log to inspect failures. For production, add persistent queueing, retry-after cooldowns, quotas, idempotency, audit logs, and authorization before connecting any code runner.

Provider links: [OpenRouter free models](https://openrouter.ai/collections/free-models), [Groq API](https://console.groq.com/docs/api-reference), [n8n Webhook docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/).
