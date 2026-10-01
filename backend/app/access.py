from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import BusinessSession, User
from app.studio_models import WorkspaceMember

def workspace_access(db: Session, session_id: str, user: User, write: bool = False) -> BusinessSession:
    session = db.get(BusinessSession, session_id)
    if session and session.user_id == user.id:
        return session
    member = db.query(WorkspaceMember).filter_by(session_id=session_id, user_id=user.id).first()
    if not session or not member:
        raise HTTPException(404, "Workspace not found.")
    if write and member.role != "editor":
        raise HTTPException(403, "This workspace is read only for your role.")
    return session
