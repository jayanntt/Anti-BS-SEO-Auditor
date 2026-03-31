import os
from sqlmodel import SQLModel, create_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./seo_audit.db")

# echo=True prints out all SQL queries to the console
# check_same_thread=False is needed for SQLite in FastAPI
engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})

def create_db_and_tables():
    from models import AuditJob, AuditResult
    SQLModel.metadata.create_all(engine)
