"""Halcyon persistence.

Transcripts are only stored when the user explicitly consents. Without
consent we keep the affect label and the environment state — enough to make
the world remember the shape of a session without keeping the words.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def uuid_str() -> str:
    return str(uuid.uuid4())


class HalcyonSession(Base):
    __tablename__ = "halcyon_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    world: Mapped[str] = mapped_column(String(40), default="zen_garden")
    consent_to_store: Mapped[bool] = mapped_column(Boolean, default=False)
    turn_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class HalcyonTurn(Base):
    __tablename__ = "halcyon_turns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    session_id: Mapped[str] = mapped_column(ForeignKey("halcyon_sessions.id"), index=True)
    turn_index: Mapped[int] = mapped_column(Integer, default=0)

    # Null unless the user consented to storage.
    text: Mapped[str | None] = mapped_column(Text, nullable=True)

    affect_label: Mapped[str] = mapped_column(String(32), default="neutral")
    valence: Mapped[float] = mapped_column(Float, default=0.0)
    arousal: Mapped[float] = mapped_column(Float, default=0.4)
    environment: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
