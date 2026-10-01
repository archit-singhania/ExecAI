from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, Response, status
import uuid
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)


def create_access_token(user_id: str, db: Session | None = None, label: str = "Browser") -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": user_id, "exp": expires_at}
    if db is not None:
        from app.studio_models import AuthSession
        sid = str(uuid.uuid4())
        db.add(AuthSession(id=sid, user_id=user_id, label=label[:200], expires_at=expires_at.replace(tzinfo=None)))
        db.commit()
        payload["jti"] = sid
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials if credentials else request.cookies.get("ceoai_session")
    if not token:
        raise unauthorized

    user_id = validate_session(token, db)
    if not user_id:
        raise unauthorized

    user = db.get(User, user_id)
    if not user:
        raise unauthorized

    request.state.user_id = user.id
    return user

def get_current_user_ws(token: str, db: Session) -> User:
    user_id = validate_session(token, db)
    if not user_id:
        raise Exception("Invalid token")
    user = db.get(User, user_id)
    if not user:
        raise Exception("User not found")
    return user


def validate_session(token: str, db: Session) -> str | None:
    from app.studio_models import AuthSession
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        sid = payload.get("jti")
        if not sid:
            # Legacy sessions must sign in once after this security upgrade.
            return None
        session = db.get(AuthSession, sid)
        if not session or session.revoked_at or session.expires_at < datetime.utcnow():
            return None
        return session.user_id if session.user_id == payload.get("sub") else None
    except JWTError:
        return None


def set_session_cookie(response: Response, token: str):
    settings = get_settings()
    response.set_cookie("ceoai_session", token, httponly=True, secure=settings.app_env == "production", samesite="lax", max_age=settings.jwt_expires_minutes * 60, path="/")


def revoke_user_sessions(db: Session, user_id: str):
    from app.studio_models import AuthSession
    db.query(AuthSession).filter(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)).update({"revoked_at": datetime.utcnow()}, synchronize_session=False)
