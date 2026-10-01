# Running and testing CEO.ai

Start with the [manual acceptance guide](docs/MANUAL_TEST.md). It includes exact PowerShell setup/startup commands, normal signup versus temporary demo mode, isolated Pro acceptance accounts, and expected results for all twenty capabilities.

The normal frontend is http://localhost:3000, and the FastAPI backend is http://localhost:8000. Keep each server in its own terminal and use the same database path after restarts. Apply Alembic migrations before starting; back up existing data and never delete the database to fix an error.

For configuration, limitations and production gates, see [RELEASE.md](docs/RELEASE.md). Existing Render/Vercel preparation is documented in [DEPLOYMENT.md](docs/DEPLOYMENT.md); hosting is deferred, and no deployment has been performed. Actual verification and recordings are in [VALIDATION.md](docs/VALIDATION.md).
