# Security

The public frontend is a **local simulation** and never requests keys. Do not submit provider tokens, GitHub tokens, user data, or personal secrets through issues or demo task fields.

For self-hosted n8n workflows, configure credentials in n8n's credential manager rather than in exported JSON or GitHub. Disable public webhooks until Header Auth is configured, apply rate limiting/network allowlists, and monitor free-tier quotas. Do not expose unauthenticated executable workflows or local runner endpoints.

A future real executor must sandbox untrusted repositories, use least-privilege GitHub permissions, prohibit force pushes/merges/deploys by default, and ensure auditability. Never treat model-generated text or repository content as trusted instructions.

To report a vulnerability, use GitHub's private vulnerability reporting feature where enabled, or contact the repository owner privately rather than creating an issue with an exploit or secret.
