import pytest
from sqlalchemy.engine import make_url

from app.config import Settings
from app.deployment import deployment_issues


def production(**changes):
    options = {
        "_env_file": None,
        "app_env": "production",
        "database_url": "postgres://account:encoded%25password@db.example.com/ceoai?sslmode=require",
        "jwt_secret": "isolated-validation-secret-32-characters",
        "cors_origins": "https://studio.example.com",
        "app_base_url": "https://studio.example.com",
    }
    options.update(changes)
    return Settings(**options)


@pytest.mark.parametrize("prefix", ["postgres://", "postgresql://", "postgresql+psycopg://"])
def test_managed_postgres_aliases_use_installed_driver(prefix):
    settings = production(database_url=prefix + "account:encoded%25password@db.example.com/ceoai?sslmode=require")
    url = make_url(settings.database_url)
    assert url.drivername == "postgresql+psycopg"
    assert url.password == "encoded%password"
    assert url.query["sslmode"] == "require"
    assert not deployment_issues(settings)


@pytest.mark.parametrize("changes", [
    {"app_env": "development"},
    {"database_url": "sqlite:///ephemeral.db"},
    {"jwt_secret": "short"},
    {"cors_origins": "*"},
    {"cors_origins": "http://localhost:3000"},
    {"cors_origins": "https://studio.example.com/path"},
    {"cors_origins": "https://*.example.com"},
    {"app_base_url": "https://wrong.example.com"},
    {"app_base_url": "https://studio.example.com/"},
])
def test_deployment_rejects_nonpersistent_or_unsafe_configuration(changes):
    issues = deployment_issues(production(**changes))
    assert issues
    assert "encoded%25password" not in " ".join(issues)
    assert "isolated-validation-secret" not in " ".join(issues)


def test_alembic_config_preserves_encoded_password_without_interpolation():
    from alembic.config import Config
    settings = production()
    config = Config()
    config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))
    assert config.get_main_option("sqlalchemy.url") == settings.database_url
