"""Start migrated local acceptance fixtures; never reuse a user's account database."""
import os
import sys
import tempfile
from pathlib import Path

backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend))

from app.config import get_settings
from app.local_fixture import create_fixture_accounts
from sqlalchemy.engine import make_url

settings = get_settings()
url = make_url(settings.database_url)
database = Path(url.database or "").resolve()
temporary = Path(tempfile.gettempdir()).resolve()
if settings.app_env != "test":
    raise SystemExit("Acceptance server requires a new isolated temporary fixture database.")
if url.get_backend_name() == "postgresql":
    from sqlalchemy import create_engine, text

    if (os.environ.get("CEOAI_E2E_POSTGRES") != "1"
            or url.host not in {"localhost", "127.0.0.1", "::1"}
            or url.database != "ceoai_browser_fixture"):
        raise SystemExit("PostgreSQL acceptance requires the dedicated loopback fixture database.")
    engine = create_engine(url)
    try:
        with engine.connect() as connection:
            has_objects = connection.scalar(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                      AND n.nspname NOT LIKE 'pg_toast%'
                      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
                )
            """))
            if has_objects:
                raise SystemExit("PostgreSQL acceptance refuses a database that already contains relations.")
    finally:
        engine.dispose()
elif (url.get_backend_name() != "sqlite" or database.name != "manual_acceptance.db"
      or not database.parent.name.startswith("ceoai-e2e-")
      or not database.is_relative_to(temporary) or database.exists()):
    raise SystemExit("Acceptance server requires a new isolated temporary fixture database.")

from alembic import command
from alembic.config import Config

config = Config(str(backend / "alembic.ini"))
config.set_main_option("script_location", str(backend / "alembic"))
command.upgrade(config, "head")
create_fixture_accounts(settings, "Correct-Horse-Browser-2026!",
                        browser_postgres=url.get_backend_name() == "postgresql")

if os.environ.get("CEOAI_E2E_HUBSPOT") == "1":
    from cryptography.fernet import Fernet
    from app import hubspot_imports

    os.environ.update(
        EXECAI_HUBSPOT_CLIENT_ID="browser-fixture",
        EXECAI_HUBSPOT_CLIENT_SECRET="fixture-only",
        EXECAI_HUBSPOT_CREDENTIAL_KEY=Fernet.generate_key().decode(),
        EXECAI_HUBSPOT_REDIRECT_URI="http://127.0.0.1:8012/api/studio/hubspot/oauth/callback",
    )

    def exchange_fixture(fields):
        assert fields.get("code") == "browser-fixture" or fields.get("refresh_token") == "fixture-refresh"
        return {"hub_id": 78, "refresh_token": "fixture-refresh", "access_token": "fixture-access"}

    def fetch_fixture(client, token, **window):
        assert token == "fixture-access"
        if window["until_ms"] - window["since_ms"] > hubspot_imports.DAY_MS // 2:
            raise hubspot_imports.HubSpotWindowTooLarge()
        second = window.get("after") == "2"
        return [{"id": "2" if second else "1", "updatedAt": "2026-01-01T12:00:00Z",
                 "properties": {"amount": "50" if second else "25", "deal_currency_code": "USD"}}], None if second else "2"

    hubspot_imports.exchange_token = exchange_fixture
    hubspot_imports.fetch_deal_page = fetch_fixture
    def fetch_company_fixture(client, token, **window):
        assert token == "fixture-access"
        return [{"id": "1", "updatedAt": "2026-01-01T12:00:00Z",
                 "properties": {"name": "Fixture company", "numberofemployees": "24"}}], None

    hubspot_imports.fetch_company_page = fetch_company_fixture

import uvicorn
uvicorn.run("app.main:app", host="127.0.0.1", port=8012)
