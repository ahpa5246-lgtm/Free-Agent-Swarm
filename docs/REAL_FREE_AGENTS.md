# Real coding agents, using only free API accounts

This milestone adds **actual provider calls and bounded source edits**. It is not a demo-mode relabel and does not use ChatGPT, Claude, Kimi, Gemini browser sessions, or subscription cookies. The public PWA stays a clearly labeled **offline simulation** until a separately authenticated, server-side status API is built. Real execution is currently through a **manual GitHub Actions workflow** or an optional n8n `workflow_dispatch` bridge.

## Supported provider routes (as of 2026-10-30)

All four routes are explicitly allowlisted and have *no paid model fallback*:

| Routing priority | Agent | API/model | Configuration |
| --- | --- | --- | --- |
| 1 | Groq GPT-OSS | `openai/gpt-oss-120b` | `GROQ_API_KEY` |
| 2 | Gemini | `gemini-3.1-flash-lite` | `GEMINI_API_KEY` |
| 3 | OpenRouter Free Router | `openrouter/free` | `OPENROUTER_API_KEY` |
| 4 | Groq Qwen | `qwen/qwen3.8-27b` | `GROQ_API_KEY` |

**Provider accounts have separate usage caps.** Two Groq models share the Groq organization's quota; a 429 from Groq will suppress subsequent Groq routes in the current run. OpenRouter `openrouter/free` may pick different models across requests, and **does not guarantee DeepSeek, Kimi, or any specific model**. The OpenRouter free route permits only free model variants. The specific Groq model rates and Gemini free eligibility may change.

Verify free-plan account status and usage *before enabling* any live workflow. **The operator must not link billing or upgrade to a paid plan.** The runner checks the model allowlist and requires the `SWARM_CONFIRM_FREE_TIER=true` signal, but cannot technically audit the billing tier of external accounts. Ineligible Gemini projects should be skipped; do not enable billing as a workaround. Gemini's free-tier data policy can permit provider model improvement: do not submit proprietary secrets or private code.

Sources: https://console.groq.com/docs/rate-limits ; https://ai.google.dev/gemini-api/docs/pricing ; https://openrouter.ai/collections/free-models

## Configure on GitHub

1. Review and merge the implementation PR before invoking the workflow from `main` — GitHub workflow dispatch generally requires the workflow on the default branch.
2. Create **free, non-billed** API keys at https://console.groq.com/keys , https://aistudio.google.com/api-keys , https://openrouter.ai/settings/keys . One is sufficient, but two independent providers allow failover.
3. Add keys under GitHub **Settings > Secrets and variables > Actions > Repository secrets** using the exact names `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`. Do not commit, paste, or log keys. No keys go in the PWA.
4. If GitHub blocks workflow-created PRs, enable **Settings > Actions > General > Allow GitHub Actions to create and approve pull requests**, if appropriate to the repository policy. The workflow does not request automatic approval.
5. In **Actions > Real free-tier coding agent (manual) > Run workflow**, enter a narrowly scoped task and one **existing** allowlisted file; check the free-tier confirmation only after verifying account settings.
6. Follow the workflow run; a successful call only stages one file, passes `npm run check`, and opens a **draft PR**. Review the diff and security before any merge.

Example task: `Improve the edge-case handling of the local demo checkpoint import. Preserve the schema and add no new dependencies.` Target: `src/engine.mjs`.

**No infinite loop:** one provider request per eligible route, maximum four routes, bounded provider timeout and GitHub job time. Rate-limit, bad response, empty output, unsafe path, oversized output, failing tests, missing credentials or provider outage block the run rather than inventing success or spending money. Full source output is required for the one target file. The maximum editable file size is 18 KiB. The runner will not execute shell commands suggested by AI and won't edit `.github`, secrets, packages, or its own runner.

## n8n link

Import `n8n/workflows/dispatch-real-free-agents.json` into a **self-hosted** n8n instance. Configure a Header Auth credential on the webhook and a separate Header Auth credential (`Authorization: Bearer <your fine-grained GitHub PAT>`) on the HTTP Request node. Only grant Actions: write on the specific project to the latter credential. This endpoint triggers GitHub Actions; it doesn't expose model secrets in the public site. **Keep the webhook private**, behind server-side auth/rate limiting, and validate task/path inputs. This optional bridge is a template and has not been live-import-tested on a running n8n server.

Use the *manual workflow* first: the n8n example assumes that you have already verified free-tier accounts and is **not** a substitute for the confirmation gate. Do not expose the webhook to anonymous users or enable it before adding authentication and request validation.

## Security and limitations

- Model output is untrusted. All edits are restricted to the specified existing source/docs file; symlinked files, symlinked parent directories, hidden segments, traversal and unexpected paths are rejected; concurrent file changes are detected via SHA-256.
- The runner separates `generate` (read-only with provider keys), `validate` (read-only, no API keys), and `publish` (write token; **does not execute generated code**) jobs. Patch artifacts cross jobs only after strict scope checking. This is not a public multi-tenant security sandbox.
- The test/build process executes modified code. CI is still not a hardened sandbox; enable network isolation or a dedicated restricted runner for **untrusted** codebases before exposing the product to arbitrary users. Only authorized repository maintainers should dispatch this workflow.
- Model-generated code is not automatically correct even when tests pass. Draft PR review is mandatory. No production auto-merge or deploy.
- This does **not** yet allow multiple agents to edit the same repository asynchronously in long, independent sessions; it handles bounded single-file tasks and free-provider failover. Durable cross-run task orchestration and a public multi-user backend are later milestones.

## Hardening review: release blockers (2026-10-30)

- Provider calls were tested with HTTP mocks. No live API model has been confirmed with credentials.
- Generated code is still tested on a networked GitHub runner: before public multi-user access, require a separate no-secrets, network-isolated sandbox.
- The product exposes four API routes across three providers, NOT six coordinated autonomous agents. Two Groq routes share a quota pool.
- Free-tier account confirmation is a checkbox, not billing verification. Never enable billing as a fallback.
- All proposed changes require human PR review. No automatic merge or deployment.
- Manual workflow dispatch becomes available only once the stacked PRs have reached default branch `main`.
