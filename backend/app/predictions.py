from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import BusinessSession, Prediction, User

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

RESOLUTIONS = {"hit", "missed", "void"}


class PredictionResolve(BaseModel):
    status: str = Field(pattern="^(hit|missed|void)$")
    note: str | None = Field(default=None, max_length=500)


def _user_session_ids(db: Session, user: User) -> list[str]:
    return [
        row.id
        for row in db.query(BusinessSession.id).filter(BusinessSession.user_id == user.id).all()
    ]


def _serialize(prediction: Prediction) -> dict:
    now = datetime.utcnow()
    return {
        "id": prediction.id,
        "agent": prediction.agent,
        "statement": prediction.statement,
        "confidence": prediction.confidence,
        "due_at": prediction.due_at,
        "status": prediction.status,
        "resolved_at": prediction.resolved_at,
        "note": prediction.note,
        "overdue": prediction.status == "pending" and prediction.due_at < now,
        "days_remaining": (prediction.due_at - now).days,
    }


@router.get("")
def list_predictions(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_ids = _user_session_ids(db, current_user)
    if not session_ids:
        return {"predictions": []}

    query = db.query(Prediction).filter(Prediction.session_id.in_(session_ids))

    if status in RESOLUTIONS or status == "pending":
        query = query.filter(Prediction.status == status)

    rows = query.order_by(Prediction.due_at).limit(200).all()
    return {"predictions": [_serialize(row) for row in rows]}


@router.patch("/{prediction_id}")
def resolve_prediction(
    prediction_id: str,
    payload: PredictionResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prediction = db.get(Prediction, prediction_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found.")

    session = db.get(BusinessSession, prediction.session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Prediction not found.")

    prediction.status = payload.status
    prediction.note = payload.note
    prediction.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(prediction)

    return _serialize(prediction)


@router.get("/calibration")
def calibration(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_ids = _user_session_ids(db, current_user)
    if not session_ids:
        return {"agents": [], "overall": None, "resolved_total": 0}

    rows = db.query(Prediction).filter(Prediction.session_id.in_(session_ids)).all()

    buckets: dict[str, dict[str, int]] = {}
    for row in rows:
        bucket = buckets.setdefault(row.agent, {"hit": 0, "missed": 0, "pending": 0, "void": 0})
        if row.status in bucket:
            bucket[row.status] += 1

    agents = []
    total_hit = 0
    total_scored = 0

    for agent, counts in buckets.items():
        scored = counts["hit"] + counts["missed"]
        accuracy = round((counts["hit"] / scored) * 100) if scored else None

        total_hit += counts["hit"]
        total_scored += scored

        agents.append(
            {
                "agent": agent,
                "hit": counts["hit"],
                "missed": counts["missed"],
                "pending": counts["pending"],
                "resolved": scored,
                "accuracy": accuracy,
            }
        )

    agents.sort(key=lambda item: (item["accuracy"] is None, -(item["accuracy"] or 0)))

    return {
        "agents": agents,
        "overall": round((total_hit / total_scored) * 100) if total_scored else None,
        "resolved_total": total_scored,
    }


def create_predictions(db: Session, session_id: str, items: list[dict]) -> int:
    created = 0
    now = datetime.utcnow()

    for item in items:
        agent = str(item.get("agent", "")).strip()
        statement = str(item.get("statement", "")).strip()
        if not agent or not statement:
            continue

        exists = (
            db.query(Prediction)
            .filter(
                Prediction.session_id == session_id,
                Prediction.agent == agent,
                Prediction.status == "pending",
            )
            .first()
        )
        if exists:
            continue

        horizon = int(item.get("horizon_days", 30) or 30)
        db.add(
            Prediction(
                session_id=session_id,
                agent=agent,
                statement=statement,
                confidence=int(item.get("confidence", 75) or 75),
                due_at=now + timedelta(days=horizon),
            )
        )
        created += 1

    return created
