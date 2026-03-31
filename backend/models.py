import uuid
from datetime import datetime
from typing import Optional, Dict

from sqlmodel import SQLModel, Field
from sqlalchemy import JSON
from sqlalchemy import Column

class AuditJob(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    url: str
    status: str = Field(default="pending") # "pending", "crawling", "analyzing", "complete", "failed"
    credit_cost: int = Field(default=0)
    scraped_data: Optional[Dict] = Field(sa_column=Column(JSON), default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AuditResult(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: uuid.UUID = Field(foreign_key="auditjob.id")
    overall_score: int
    risk_level: str
    executive_summary: str
    eeat_findings: Optional[Dict] = Field(sa_column=Column(JSON), default=None)
    technical_findings: Optional[Dict] = Field(sa_column=Column(JSON), default=None)
    content_findings: Optional[Dict] = Field(sa_column=Column(JSON), default=None)
    action_items: Optional[Dict] = Field(sa_column=Column(JSON), default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
