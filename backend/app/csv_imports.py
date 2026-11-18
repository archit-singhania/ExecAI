"""Stage immutable source observations and reconcile again at approval time."""
import csv
import io
import json
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.outcomes import lock_workspace, owned
from app.studio import record_activity, record_out
from app.studio_models import StudioRecord

router = APIRouter(prefix="/api/studio", tags=["csv-imports"])


class Columns(BaseModel):
    source_id: str
    metric: str
    value: str
    unit: str
    observed_on: str


class CsvInput(BaseModel):
    source: str = Field(min_length=1, max_length=120)
    csv_text: str = Field(min_length=1, max_length=500_000)
    columns: Columns


class Approval(BaseModel):
    version: int = Field(ge=1)
    confirmed: Literal[True]


def receipt_index(db, sid, source):
    receipts = db.query(StudioRecord).filter_by(session_id=sid, kind="csv_receipt", title=source)
    return {item["source_id"]: item for row in receipts for item in [json.loads(row.data)["observation"]]}


def classify(observation, seen):
    previous = seen.get(observation["source_id"])
    if previous is None:
        seen[observation["source_id"]] = observation
        return "ready"
    return "duplicate" if previous == observation else "conflict"


def parse(payload, seen):
    reader = csv.reader(io.StringIO(payload.csv_text.lstrip("\ufeff"), newline=""), strict=True)
    try:
        header = next(reader, [])
        mapping = payload.columns.model_dump()
        if len(set(header)) != len(header) or len(set(mapping.values())) != len(mapping) or any(col not in header for col in mapping.values()):
            raise HTTPException(422, "Map five distinct headers from a CSV with unique column names.")
        indexes = {field: header.index(col) for field, col in mapping.items()}
        rows = []
        for values in reader:
            if len(rows) >= 500:
                raise HTTPException(422, "Split files larger than 500 observations into smaller batches.")
            row = {"line": reader.line_num}
            try:
                if len(values) != len(header):
                    raise ValueError("Column count differs from the header.")
                observation = {field: values[i].strip() for field, i in indexes.items()}
                if any(not value or len(value) > 200 for value in observation.values()):
                    raise ValueError("Mapped cells must contain 1–200 characters.")
                number = Decimal(observation["value"])
                if not number.is_finite() or number.copy_abs() > 10**15 or number.as_tuple().exponent < -8:
                    raise ValueError("Use a finite number within ±10^15 and at most eight decimal places.")
                observation["value"] = format(number.normalize(), "f") if number else "0"
                observation["observed_on"] = date.fromisoformat(observation["observed_on"]).isoformat()
                row.update(status=classify(observation, seen), observation=observation)
            except (ValueError, InvalidOperation) as exc:
                row.update(status="invalid", error=str(exc) if isinstance(exc, ValueError) else "Invalid numeric value.")
            rows.append(row)
    except csv.Error as exc:
        raise HTTPException(422, f"Malformed CSV near line {reader.line_num}: {exc}") from exc
    if not rows:
        raise HTTPException(422, "The CSV contains no observations.")
    return rows


def reconcile(rows):
    totals = defaultdict(Decimal)
    for row in rows:
        if row["status"] in {"ready", "imported"}:
            obs = row["observation"]
            totals[obs["metric"], obs["unit"]] += Decimal(obs["value"])
    return {"counts": dict(Counter(row["status"] for row in rows)), "totals": [
        {"metric": metric, "unit": unit, "sum": str(value)} for (metric, unit), value in sorted(totals.items())]}


@router.get("/{sid}/imports/csv")
def listing(sid: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, sid, user)
    rows = db.query(StudioRecord).filter_by(session_id=sid, kind="csv_batch").order_by(StudioRecord.created_at.desc())
    return [record_out(row) for row in rows.limit(50)]


@router.post("/{sid}/imports/csv", status_code=201)
def stage(sid: str, payload: CsvInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, sid, user, True)
    batch = prepare_batch(sid, payload, db, user)
    db.commit()
    db.refresh(batch)
    return record_out(batch)


def prepare_batch(sid, payload, db, user):
    source = payload.source.strip()
    if not source:
        raise HTTPException(422, "Name the source so its identifiers can be reconciled on later imports.")
    rows = parse(payload, receipt_index(db, sid, source))
    data = {"state": "staged", "source": source, "columns": payload.columns.model_dump(), "rows": rows, **reconcile(rows)}
    batch = StudioRecord(session_id=sid, author_id=user.id, kind="csv_batch", title=source, data=json.dumps(data))
    db.add(batch)
    return batch


@router.post("/{sid}/imports/csv/{rid}/approve")
def approve(sid: str, rid: str, payload: Approval, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, sid, user, True)
    batch = owned(db, sid, rid, "csv_batch")
    data = json.loads(batch.data)
    if data["state"] == "approved":
        return record_out(batch)
    if batch.version != payload.version:
        raise HTTPException(409, "The import changed. Reload and review it again.")
    seen = receipt_index(db, sid, batch.title)
    approved_at = datetime.now(timezone.utc).isoformat()
    for row in data["rows"]:
        if row["status"] != "ready":
            continue
        obs = row["observation"]
        row["status"] = classify(obs, seen)
        if row["status"] != "ready":
            continue
        metric = StudioRecord(session_id=sid, author_id=user.id, kind="metric", title=obs["metric"], data=json.dumps({
            "value": float(obs["value"]), "unit": obs["unit"], "observed_on": obs["observed_on"],
            "source": batch.title, "source_id": obs["source_id"], "import_batch": batch.id, "imported_at": approved_at}))
        db.add(metric)
        db.flush()
        row.update(status="imported", metric_id=metric.id)
        db.add(StudioRecord(session_id=sid, author_id=user.id, kind="csv_receipt", title=batch.title,
                            data=json.dumps({"observation": obs, "batch_id": batch.id, "metric_id": metric.id})))
    data.update(state="approved", approved_at=approved_at, approved_by=user.id, **reconcile(data["rows"]))
    batch.data = json.dumps(data)
    batch.version += 1
    record_activity(db, sid, user, "CSV batch approved", batch.title)
    db.commit()
    db.refresh(batch)
    return record_out(batch)
