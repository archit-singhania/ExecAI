"""Render pre-deploy checks and additive migrations; never print credentials."""
import argparse
from pathlib import Path
from urllib.parse import urlsplit

from app.config import Settings, get_settings


def deployment_issues(settings: Settings) -> list[str]:
    issues: list[str] = []
    if settings.app_env != "production":
        issues.append("APP_ENV must be production.")
    if not settings.database_url.startswith("postgresql+psycopg://"):
        issues.append("Use a persistent PostgreSQL database through the installed psycopg driver.")
    if settings.jwt_secret == "dev-only-change-me-in-prod" or len(settings.jwt_secret) < 32:
        issues.append("JWT_SECRET must contain at least 32 randomly generated characters.")
    origins = settings.cors_origin_list
    if not origins or any(not _https_origin(origin) for origin in origins):
        issues.append("CORS_ORIGINS must contain exact HTTPS application origins without paths or wildcards.")
    if not _https_origin(settings.app_base_url):
        issues.append("APP_BASE_URL must be the HTTPS application origin.")
    elif settings.app_base_url not in origins:
        issues.append("APP_BASE_URL must be included in CORS_ORIGINS.")
    return issues


def _https_origin(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        _ = parsed.port
        return bool(
            parsed.scheme == "https"
            and parsed.hostname
            and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}
            and "*" not in parsed.netloc
            and not parsed.username
            and not parsed.password
            and not parsed.path
            and not parsed.query
            and not parsed.fragment
        )
    except ValueError:
        return False


def migrate() -> None:
    from alembic import command
    from alembic.config import Config

    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    command.upgrade(config, "head")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "migrate"))
    args = parser.parse_args()
    issues = deployment_issues(get_settings())
    if issues:
        for issue in issues:
            print(f"Deployment blocked: {issue}")
        return 1
    print("Production configuration check passed. Live-service health is not implied.")
    if args.action == "migrate":
        try:
            migrate()
        except Exception:
            print("Database upgrade failed; deployment was stopped. Inspect protected migration logs.")
            return 1
        print("Database migration completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
