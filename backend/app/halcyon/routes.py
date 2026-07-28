"""Halcyon HTTP + WebSocket surface.

Flow:

    Next.js  ──POST /turn──▶  planner  ──▶  DB
                                 │
                                 └──push──▶  WebSocket  ──▶  Unreal

Unreal holds one WebSocket per session and does nothing but apply whatever
EnvironmentCommand arrives. It never talks to an LLM, never sees a
transcript, and can reconnect at any time because every message is a full
world snapshot rather than a delta.
"""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.auth import decode_access_token, get_current_user
from app.database import SessionLocal, get_db
from app.halcyon.affect import detect_crisis, estimate_affect
from app.halcyon.models import HalcyonSession, HalcyonTurn
from app.halcyon.planner import (
    CRISIS_REPLY,
    compose_reply,
    plan_crisis_environment,
    plan_environment,
)
from app.halcyon.schemas import (
    AffectReading,
    EnvironmentCommand,
    HalcyonSessionOut,
    SessionStartIn,
    TurnIn,
    TurnOut,
)
from app.halcyon.worlds import WORLD_BASELINES, baseline_for
from app.models import User

router = APIRouter(prefix="/api/halcyon", tags=["halcyon"])


class WorldBridge:
    """Fan-out of environment commands to whichever Unreal clients are attached."""

    def __init__(self) -> None:
        self._clients: dict[str, list[WebSocket]] = {}

    async def attach(self, session_id: str, socket: WebSocket) -> None:
        await socket.accept()
        self._clients.setdefault(session_id, []).append(socket)

    def detach(self, session_id: str, socket: WebSocket) -> None:
        sockets = self._clients.get(session_id)
        if not sockets:
            return
        if socket in sockets:
            sockets.remove(socket)
        if not sockets:
            self._clients.pop(session_id, None)

    async def push(self, session_id: str, command: EnvironmentCommand) -> int:
        sockets = list(self._clients.get(session_id, []))
        payload = {"type": "environment", "data": command.model_dump()}
        delivered = 0
        for socket in sockets:
            try:
                await socket.send_json(payload)
                delivered += 1
            except Exception:
                self.detach(session_id, socket)
        return delivered


bridge = WorldBridge()


def _owned_session(session_id: str, db: Session, user: User) -> HalcyonSession:
    session = db.get(HalcyonSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


@router.get("/worlds")
def list_worlds():
    return [
        {"id": world_id, "baseline": baseline.model_dump()}
        for world_id, baseline in WORLD_BASELINES.items()
    ]


@router.post("/sessions", response_model=HalcyonSessionOut)
def start_session(
    payload: SessionStartIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = HalcyonSession(
        user_id=current_user.id,
        world=payload.world,
        consent_to_store=payload.consent_to_store,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return HalcyonSessionOut(
        id=session.id,
        world=session.world,
        started_at=session.started_at,
        ended_at=session.ended_at,
        turn_count=session.turn_count,
        environment=baseline_for(session.world),
    )


@router.post("/sessions/{session_id}/turn", response_model=TurnOut)
async def take_turn(
    session_id: str,
    payload: TurnIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session(session_id, db, current_user)
    if session.ended_at:
        raise HTTPException(status_code=409, detail="This session has ended.")

    if payload.world and payload.world != session.world:
        session.world = payload.world

    in_crisis = detect_crisis(payload.text)

    if in_crisis:
        affect = AffectReading(label="crisis", valence=-1.0, arousal=0.6, confidence=1.0)
        environment = plan_crisis_environment(session.world)
        reply = CRISIS_REPLY
    else:
        affect = estimate_affect(payload.text)
        environment = plan_environment(session.world, affect)
        reply = compose_reply(affect, seed=session.turn_count)

    session.turn_count += 1
    turn = HalcyonTurn(
        session_id=session.id,
        turn_index=session.turn_count,
        text=payload.text if session.consent_to_store else None,
        affect_label=affect.label,
        valence=affect.valence,
        arousal=affect.arousal,
        environment=json.dumps(environment.model_dump()),
    )
    db.add(turn)
    db.commit()

    await bridge.push(session.id, environment)

    return TurnOut(
        reply=reply,
        affect=affect,
        environment=environment,
        turn_index=session.turn_count,
    )


@router.post("/sessions/{session_id}/end", response_model=HalcyonSessionOut)
def end_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session(session_id, db, current_user)
    session.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return HalcyonSessionOut.model_validate(session)


@router.get("/sessions", response_model=list[HalcyonSessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(HalcyonSession)
        .filter(HalcyonSession.user_id == current_user.id)
        .order_by(desc(HalcyonSession.started_at))
        .limit(50)
        .all()
    )
    return [HalcyonSessionOut.model_validate(session) for session in sessions]


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session(session_id, db, current_user)
    db.query(HalcyonTurn).filter(HalcyonTurn.session_id == session.id).delete()
    db.delete(session)
    db.commit()
    return {"deleted": session_id}


@router.delete("/sessions")
def delete_all_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = db.query(HalcyonSession).filter(HalcyonSession.user_id == current_user.id).all()
    ids = [session.id for session in sessions]
    if ids:
        db.query(HalcyonTurn).filter(HalcyonTurn.session_id.in_(ids)).delete(synchronize_session=False)
        db.query(HalcyonSession).filter(HalcyonSession.id.in_(ids)).delete(synchronize_session=False)
        db.commit()
    return {"deleted": len(ids)}


@router.websocket("/ws/{session_id}")
async def world_socket(websocket: WebSocket, session_id: str, token: str = Query(...)):
    """Unreal connects here.

    The token rides in the query string rather than a header — Unreal's
    WebSocket module makes custom headers awkward, and the connection is
    localhost-only during prototyping.
    """
    user_id = decode_access_token(token)
    if not user_id:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        session = db.get(HalcyonSession, session_id)
        if not session or session.user_id != user_id:
            await websocket.close(code=4404)
            return
        world = session.world
    finally:
        db.close()

    await bridge.attach(session_id, websocket)

    await websocket.send_json({"type": "environment", "data": baseline_for(world).model_dump()})

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        bridge.detach(session_id, websocket)
    except Exception:
        bridge.detach(session_id, websocket)
