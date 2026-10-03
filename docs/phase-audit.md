# Current release audit

The current product acceptance scope is the [twenty-capability matrix](CAPABILITIES.md). Security, migration, accessible material design, CI and setup are additional foundations supporting that scope.

For actual passed checks, see [VALIDATION.md](VALIDATION.md). For reproducible manual checks, including isolated paid-feature fixtures without a purchase, see [MANUAL_TEST.md](MANUAL_TEST.md). The current [architecture](architecture.md) documents nine concurrent specialists and a durable single-process worker design; old six-agent/LangGraph/Neon deployment assumptions do not describe the running product.

Hosting is deferred. PostgreSQL/pgvector CI and configured provider, research, payment, email, microphone, cron and native Unreal acceptance remain release gates. See [DEPLOYMENT.md](DEPLOYMENT.md) before using existing hosting accounts. Local implementation and tests are not evidence of deployment, model quality, revenue or adoption.
