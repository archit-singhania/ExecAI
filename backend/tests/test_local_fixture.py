import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import Base
from app.local_fixture import FIXTURES, create_fixture_accounts, fixture_allowed
from app.models import User
from app.auth import verify_password


@pytest.mark.parametrize("environment,database", [
    ("production", "sqlite:///manual_acceptance.db"),
    ("development", "sqlite:///ceo_ai.db"),
    ("test", "postgresql://account:password@db.example.com/manual_acceptance.db"),
    ("test", "sqlite:///:memory:"),
])
def test_fixture_refuses_production_or_user_database(environment, database):
    settings = Settings(_env_file=None, app_env=environment, database_url=database)
    assert not fixture_allowed(settings)
    with pytest.raises(ValueError):
        create_fixture_accounts(settings, "fixture-only-password")


def test_fixture_creates_real_local_accounts_and_refuses_overwrite(tmp_path):
    settings = Settings(_env_file=None, app_env="test", database_url=f"sqlite:///{tmp_path / 'manual_acceptance.db'}")
    engine = create_engine(settings.database_url)
    Base.metadata.create_all(engine)
    password = "isolated-fixture-password"
    assert create_fixture_accounts(settings, password) == [email for email, _, _ in FIXTURES]
    with Session(engine) as db:
        owner = db.query(User).filter_by(email=FIXTURES[0][0]).one()
        assert owner.tier == "pro" and owner.subscription_id is None
        assert verify_password(password, owner.hashed_password)
        assert owner.hashed_password != password
        assert db.query(User).count() == 3
    with pytest.raises(ValueError, match="already contains"):
        create_fixture_accounts(settings, "different-fixture-password")
    with Session(engine) as db:
        assert verify_password(password, db.query(User).filter_by(email=FIXTURES[0][0]).one().hashed_password)
    engine.dispose()
