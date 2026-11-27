"""Workspace-owned staging and checkpointing for HubSpot deal snapshots."""

import json
import os
import time
import hashlib
import secrets
from typing import Literal
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.csv_imports import prepare_batch
from app.database import get_db
from app.hubspot_observations import (
    HubSpotAccessDenied, HubSpotWindowTooLarge, fetch_company_page, fetch_deal_page,
    stageable_companies, stageable_deals,
)
from app.models import User
from app.outcomes import lock_workspace
from app.studio import record_out
from app.studio_models import HubSpotConnection, StudioRecord

router = APIRouter(prefix="/api/studio", tags=["hubspot-imports"])
DAY_MS = 86_400_000
TOKEN_URL = "https://api.hubapi.com/oauth/v1/token"


def oauth_config():
    values = [os.environ.get("EXECAI_HUBSPOT_" + name) for name in ("CLIENT_ID","CLIENT_SECRET","REDIRECT_URI","CREDENTIAL_KEY")]
    if not all(values):
        raise HTTPException(409, "HubSpot OAuth has not been configured")
    try:
        return *values[:3], Fernet(values[3].encode())
    except ValueError:
        raise HTTPException(409, "HubSpot credential encryption key is invalid") from None


def exchange_token(fields):
    try:
        response = httpx.post(TOKEN_URL, data=fields, timeout=15, follow_redirects=False)
        response.raise_for_status()
        grant = response.json()
        if not isinstance(grant, dict) or not isinstance(grant.get("access_token"), str) or not grant["access_token"]:
            raise ValueError()
        return grant
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "HubSpot authorization exchange failed") from None


@router.post("/{sid}/imports/hubspot/oauth/start")
def oauth_start(sid: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, sid, user, True)
    client_id, _, redirect, _ = oauth_config()
    state = secrets.token_urlsafe(32)
    row = db.get(HubSpotConnection, sid)
    if row is None:
        row = HubSpotConnection(session_id=sid)
        db.add(row)
    row.state_hash = hashlib.sha256(state.encode()).hexdigest()
    row.state_owner = user.id
    row.state_expires = int(time.time()) + 600
    db.commit()
    url = "https://app.hubspot.com/oauth/authorize?" + urlencode(
        dict(client_id=client_id, redirect_uri=redirect, scope="crm.objects.deals.read",
             optional_scope="crm.objects.companies.read", state=state))
    return {"url": url}


@router.get("/hubspot/oauth/callback")
def oauth_callback(state: str, code: str = "", db: Session = Depends(get_db)):
    client_id, secret, redirect, cipher = oauth_config()
    digest = hashlib.sha256(state.encode()).hexdigest()
    row = db.query(HubSpotConnection).filter_by(state_hash=digest).one_or_none()
    if not row or row.state_expires < time.time():
        raise HTTPException(400, "HubSpot sign-in expired or was already used")
    sid = row.session_id
    user = db.get(User, row.state_owner)
    if user is None:
        raise HTTPException(403, "Workspace access has changed")
    lock_workspace(db, sid, user, True)
    db.refresh(row)
    if row.state_hash != digest or row.state_expires < time.time():
        raise HTTPException(400, "HubSpot sign-in expired or was already used")
    row.state_expires = 0
    db.commit()
    if not code:
        raise HTTPException(400, "HubSpot sign-in cancelled")
    grant = exchange_token(dict(grant_type="authorization_code", code=code, client_id=client_id,
                                client_secret=secret, redirect_uri=redirect))
    portal = str(grant.get("hub_id", ""))
    refresh = grant.get("refresh_token")
    if not portal.isascii() or not portal.isdecimal() or len(portal)>30 or not isinstance(refresh,str) or not refresh:
        raise HTTPException(502, "HubSpot did not return a portal and refresh token")
    lock_workspace(db, sid, user, True)
    db.refresh(row)
    if row.state_hash != digest or row.state_expires != 0:
        raise HTTPException(409, "HubSpot sign-in was replaced")
    row.portal = portal
    row.credential = cipher.encrypt(json.dumps([sid,portal,refresh]).encode()).decode()
    row.state_hash = ""
    db.commit()
    return {"connected": True, "message": "Return to ExecAI to synchronize HubSpot."}


def refresh_access(row):
    client_id, secret, _, cipher = oauth_config()
    try:
        sid, portal, refresh = json.loads(cipher.decrypt(row.credential.encode()))
        if sid != row.session_id or portal != row.portal:
            raise ValueError()
    except (InvalidToken, ValueError, TypeError):
        raise HTTPException(409, "Reconnect HubSpot to restore access") from None
    grant = exchange_token(dict(grant_type="refresh_token", client_id=client_id, client_secret=secret, refresh_token=refresh))
    if grant.get("hub_id") is not None and str(grant["hub_id"]) != portal:
        raise HTTPException(502, "HubSpot returned a different portal")
    rotated = grant.get("refresh_token")
    if isinstance(rotated, str) and rotated and rotated != refresh:
        row.credential = cipher.encrypt(json.dumps([sid,portal,rotated]).encode()).decode()
    return grant["access_token"], portal


def host_connection(sid):
    if os.environ.get("EXECAI_HUBSPOT_WORKSPACE") != sid:
        return None
    token = os.environ.get("EXECAI_HUBSPOT_ACCESS_TOKEN")
    portal = os.environ.get("EXECAI_HUBSPOT_PORTAL_ID")
    return (token, portal) if token and portal else None


def checkpoint(db, sid, portal):
    return db.query(StudioRecord).filter_by(session_id=sid, kind="hubspot_checkpoint", title=portal).one_or_none()


@router.get("/{sid}/imports/hubspot")
def status(sid: str, object_type: Literal["deals", "companies"] = "deals",
           db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, sid, user)
    connection = host_connection(sid)
    oauth = db.get(HubSpotConnection, sid)
    linked = bool(oauth and oauth.credential)
    portal = oauth.portal if linked else connection[1] if connection else None
    if portal and object_type == "companies":
        portal = f"companies:{portal}"
    row = checkpoint(db, sid, portal) if portal else None
    return {"available": bool(portal), "oauth_linked": linked, "checkpoint": json.loads(row.data) if row else None}


@router.delete("/{sid}/imports/hubspot/oauth")
def disconnect(sid: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, sid, user, True)
    row = db.get(HubSpotConnection, sid)
    if row:
        row.credential = row.portal = row.state_hash = row.state_owner = ""
        row.state_expires = 0
    db.commit()
    return {"disconnected": True}


@router.post("/{sid}/imports/hubspot/sync")
def sync(sid: str, object_type: Literal["deals", "companies"] = "deals",
         db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, sid, user, True)
    oauth = db.get(HubSpotConnection, sid)
    connection = refresh_access(oauth) if oauth and oauth.credential else host_connection(sid)
    if not connection:
        raise HTTPException(409, "HubSpot is not configured for this workspace")
    token, portal = connection
    companies = object_type == "companies"
    checkpoint_key = f"companies:{portal}" if companies else portal
    row = checkpoint(db, sid, checkpoint_key)
    now = int(time.time() * 1000)
    state = json.loads(row.data) if row else {"since_ms": now - DAY_MS, "until_ms": None, "after": None}
    # Allow time for recent provider changes to become searchable.
    cutoff = now - 300_000
    since = state["since_ms"]
    until = state["until_ms"] or min(cutoff, since + DAY_MS)
    if until <= since:
        db.commit()  # Preserve a rotated refresh credential even when caught up.
        return {"batch": None, "checkpoint": state, "skipped": 0}
    narrowed = False
    try:
        fetch = fetch_company_page if companies else fetch_deal_page
        stage = stageable_companies if companies else stageable_deals
        with httpx.Client() as client:
            records, cursor = fetch(client, token, since_ms=since, until_ms=until, after=state["after"])
        payload, skipped = stage(portal, records)
    except HubSpotWindowTooLarge:
        if until - since <= 1:
            db.commit()
            raise HTTPException(502, "HubSpot exceeded its result limit in a single millisecond. Checkpoint kept.") from None
        until = since + (until - since) // 2
        payload, skipped, cursor, narrowed = None, 0, None, True
    except HubSpotAccessDenied:
        db.commit()
        scope = "crm.objects.companies.read" if companies else "crm.objects.deals.read"
        raise HTTPException(409, f"Reconnect HubSpot and grant {scope}. The checkpoint was kept.") from None
    except (ValueError, RuntimeError, KeyError, TypeError):
        # Token rotation has already happened upstream. No batch or checkpoint
        # was modified, so persist the replacement before returning a retryable error.
        db.commit()
        raise HTTPException(502, "HubSpot page could not be staged. The checkpoint was kept.") from None
    state = ({"since_ms": since, "until_ms": until, "after": cursor} if narrowed or cursor is not None
             else {"since_ms": until, "until_ms": None, "after": None})
    try:
        # The savepoint flushes credential rotation first and isolates the batch
        # and checkpoint so both roll back together if staging fails.
        with db.begin_nested():
            batch = prepare_batch(sid, payload, db, user) if payload else None
            if row is None:
                row = StudioRecord(session_id=sid, author_id=user.id, kind="hubspot_checkpoint", title=checkpoint_key)
                db.add(row)
            row.data = json.dumps(state)
    except (HTTPException, SQLAlchemyError):
        db.commit()
        raise HTTPException(502, "HubSpot page could not be staged. The checkpoint was kept.") from None
    db.commit()
    return {"batch": record_out(batch) if batch else None, "checkpoint": state, "skipped": skipped, "window_narrowed": narrowed}
