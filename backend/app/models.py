import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def uuid_str() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120), default="")
    tier: Mapped[str] = mapped_column(String(24), default="free")
    stripe_customer_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    subscription_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    subscription_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    subscription_ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    runs_this_period: Mapped[int] = mapped_column(Integer, default=0)
    period_started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sessions: Mapped[list["BusinessSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class BusinessSession(Base):
    __tablename__ = "business_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(180))
    business_goal: Mapped[str] = mapped_column(Text)
    health_score: Mapped[int] = mapped_column(Integer, default=72)
    runway_months: Mapped[int] = mapped_column(Integer, default=6)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages: Mapped[list["Message"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    reports: Mapped[list["AgentReport"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    user: Mapped["User | None"] = relationship(back_populates="sessions")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    session_id: Mapped[str] = mapped_column(ForeignKey("business_sessions.id"))
    role: Mapped[str] = mapped_column(String(24))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped[BusinessSession] = relationship(back_populates="messages")


class AgentReport(Base):
    __tablename__ = "agent_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    session_id: Mapped[str] = mapped_column(ForeignKey("business_sessions.id"))
    agent: Mapped[str] = mapped_column(String(80))
    report_type: Mapped[str] = mapped_column(String(40), default="agent")
    title: Mapped[str] = mapped_column(String(180))
    summary: Mapped[str] = mapped_column(Text)
    bullets: Mapped[str] = mapped_column(Text, default="")
    score: Mapped[int] = mapped_column(Integer, default=70)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped[BusinessSession] = relationship(back_populates="reports")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    session_id: Mapped[str] = mapped_column(ForeignKey("business_sessions.id"))
    title: Mapped[str] = mapped_column(String(220))
    description: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(24), default="Medium")
    status: Mapped[str] = mapped_column(String(40), default="Ready")
    created_by_agent: Mapped[str] = mapped_column(String(80), default="CEO")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    session: Mapped[BusinessSession] = relationship(back_populates="tasks")


class BusinessMemory(Base):
    __tablename__ = "business_memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    session_id: Mapped[str] = mapped_column(ForeignKey("business_sessions.id"))
    kind: Mapped[str] = mapped_column(String(40), default="decision")
    content: Mapped[str] = mapped_column(Text)
    importance: Mapped[float] = mapped_column(Float, default=0.5)
    embedding_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ReviewSchedule(Base):
    """Standing cadence for automatic board reviews.

    One row per user. The board convenes on this schedule whether or not the
    founder opens the app — this is the accountability loop, not a reminder.
    """

    __tablename__ = "review_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    cadence: Mapped[str] = mapped_column(String(24), default="weekly") 
    weekday: Mapped[int] = mapped_column(Integer, default=0)  
    hour: Mapped[int] = mapped_column(Integer, default=9) 
    tz_offset_minutes: Mapped[int] = mapped_column(Integer, default=0) 
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
