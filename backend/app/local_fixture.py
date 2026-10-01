"""Create clearly labeled local acceptance accounts in a dedicated empty database."""
import getpass
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.config import Settings, get_settings

FIXTURES = (
    ("owner.fixture@example.com", "Local QA Owner · Illustrative", "pro"),
    ("editor.fixture@example.com", "Local QA Editor · Illustrative", "free"),
    ("viewer.fixture@example.com", "Local QA Viewer · Illustrative", "free"),
)


def fixture_allowed(settings: Settings) -> bool:
    url = make_url(settings.database_url)
    return (
        settings.app_env in {"development", "test"}
        and url.drivername == "sqlite"
        and bool(url.database)
        and Path(url.database).name == "manual_acceptance.db"
    )


def create_fixture_accounts(settings: Settings, password: str) -> list[str]:
    if not fixture_allowed(settings):
        raise ValueError("Use development/test mode and a dedicated manual_acceptance.db SQLite database.")
    if len(password) < 12:
        raise ValueError("Choose a fixture password with at least 12 characters.")
    from app.auth import hash_password
    from app.models import User

    engine = create_engine(settings.database_url)
    try:
        with Session(engine) as db:
            if db.query(User).count():
                raise ValueError("The fixture database already contains accounts; nothing was changed.")
            hashed = hash_password(password)
            for email, name, tier in FIXTURES:
                db.add(User(email=email, name=name, hashed_password=hashed, tier=tier))
            db.commit()
        return [email for email, _, _ in FIXTURES]
    finally:
        engine.dispose()


def main() -> int:
    settings = get_settings()
    if not fixture_allowed(settings):
        print("Fixture blocked: select a dedicated manual_acceptance.db in development/test mode.")
        return 1
    password = getpass.getpass("Choose a local fixture password (at least 12 characters): ")
    if password != getpass.getpass("Confirm fixture password: "):
        print("Passwords differ. Nothing was changed.")
        return 1
    try:
        emails = create_fixture_accounts(settings, password)
    except ValueError as exc:
        print(str(exc))
        return 1
    except Exception:
        print("Fixture setup failed. Apply Alembic migrations to the dedicated database first.")
        return 1
    for email in emails:
        print(f"Created local acceptance account: {email}")
    print("Owner has a fixture Pro entitlement for local export/scheduling tests; no purchase occurred.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
