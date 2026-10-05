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
database = Path(make_url(settings.database_url).database or "").resolve()
temporary = Path(tempfile.gettempdir()).resolve()
if (settings.app_env != "test" or database.name != "manual_acceptance.db"
        or not database.parent.name.startswith("ceoai-e2e-")
        or not database.is_relative_to(temporary) or database.exists()):
    raise SystemExit("Acceptance server requires a new isolated temporary fixture database.")

from alembic import command
from alembic.config import Config

config = Config(str(backend / "alembic.ini"))
config.set_main_option("script_location", str(backend / "alembic"))
command.upgrade(config, "head")
create_fixture_accounts(settings, "Correct-Horse-Browser-2026!")

import uvicorn
uvicorn.run("app.main:app", host="127.0.0.1", port=8012)
