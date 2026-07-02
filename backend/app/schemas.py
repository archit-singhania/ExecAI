from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class SessionCreate(BaseModel):
    business_goal: str = Field(min_length=5, max_length=5000)


class SessionOut(BaseModel):
    id: str
    title: str
    business_goal: str
    health_score: int
    runway_months: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=8000)


class AgentReportOut(BaseModel):
    id: str | None = None
    agent: str
    report_type: str = "agent"
    title: str
    summary: str
    bullets: list[str]
    score: int
    created_at: datetime | None = None


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    reports: list[AgentReportOut] = []

    model_config = {"from_attributes": True}


class TaskOut(BaseModel):
    id: str
    title: str
    description: str = ""
    priority: str
    status: str
    created_by_agent: str
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class TaskUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=40)


class MemoryOut(BaseModel):
    id: str
    kind: str
    content: str
    importance: float
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardOut(BaseModel):
    active_session: SessionOut | None
    recommendations: list[str]
    tasks: list[TaskOut]
    reports: list[AgentReportOut]


class ReportExportOut(BaseModel):
    id: str
    filename: str
    markdown: str


class MemorySearchOut(BaseModel):
    query: str
    results: list[MemoryOut]
