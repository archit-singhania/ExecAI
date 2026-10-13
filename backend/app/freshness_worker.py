"""Periodic checks over persisted baselines; catches up after application restart."""
import asyncio
import logging
from app.database import SessionLocal
from app.freshness import scan
from app.studio_models import StudioRecord

def tick():
    # Keyset pages avoid loading every workspace or holding one global transaction.
    last = ""
    total = 0
    while True:
        with SessionLocal() as db:
            ids = [sid for (sid,) in db.query(StudioRecord.session_id).filter(StudioRecord.kind == "evidence_baseline", StudioRecord.session_id > last).distinct().order_by(StudioRecord.session_id).limit(100)]
        if not ids:
            return total
        for sid in ids:
            try:
                with SessionLocal() as db:
                    total += scan(db, sid)
                    db.commit()
            except Exception:
                logging.getLogger(__name__).exception("Freshness check failed for workspace %s; retrying next cycle", sid)
        last = ids[-1]

async def run(interval):
    while True:
        try:
            await asyncio.to_thread(tick)
        except Exception:
            logging.getLogger(__name__).exception("Freshness worker cycle failed; retrying")
        await asyncio.sleep(interval)
