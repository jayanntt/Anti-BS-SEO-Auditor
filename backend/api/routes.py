import asyncio
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlmodel import Session, select
from scraper.crawler import scrape_url
from agents.engine import run_audit_pipeline
from database import engine
from models import AuditJob, AuditResult

router = APIRouter()

class AuditRequest(BaseModel):
    url: str

class AuditResponse(BaseModel):
    job_id: str
    message: str

def process_audit_background(job_id: uuid.UUID, url: str):
    with Session(engine) as session:
        job = session.get(AuditJob, job_id)
        if not job: return
        
        try:
            job.status = "crawling"
            session.commit()
            
            # Scrape
            scraped_data = asyncio.run(scrape_url(url))
            scraped_data["url"] = url
            
            job.status = "analyzing"
            session.commit()
            
            # Run engine
            results = asyncio.run(run_audit_pipeline(scraped_data))
            
            # Extract synthesis correctly
            synthesis = results.get("synthesis", {})
            if "error" in synthesis:
                synthesis = {
                    "overall_score": 0,
                    "risk_level": "High",
                    "executive_summary": f"Backend API Error: {synthesis['error'][:500]}. Please check your API usage limits or billing account.",
                    "prioritized_actions": [
                        {
                            "priority": 1,
                            "category": "System",
                            "issue": "API Request Failed",
                            "fix": "Upgrade your Gemini API tier or wait until your quota resets.",
                            "estimated_impact": "Critical"
                        }
                    ]
                }
            elif isinstance(synthesis, list) and len(synthesis) > 0:
                 synthesis = synthesis[0] # Edge case if LLM returns list
            
            # Save results
            audit_result = AuditResult(
                job_id=job.id,
                overall_score=synthesis.get("overall_score", 0),
                risk_level=synthesis.get("risk_level", "Unknown"),
                executive_summary=synthesis.get("executive_summary", ""),
                eeat_findings=results.get("eeat", {}),
                technical_findings=results.get("technical", {}),
                content_findings=results.get("content_patterns", {}),
                action_items=synthesis.get("prioritized_actions", [])
            )
            session.add(audit_result)
            
            job.status = "complete"
            session.commit()
            
        except Exception as e:
            print(f"Error in background task: {e}")
            job.status = "failed"
            session.commit()

@router.post("/audit", response_model=AuditResponse)
def start_audit(request: AuditRequest, background_tasks: BackgroundTasks):
    with Session(engine) as session:
        job = AuditJob(url=request.url)
        session.add(job)
        session.commit()
        session.refresh(job)
        
    background_tasks.add_task(process_audit_background, job.id, request.url)
    return AuditResponse(job_id=str(job.id), message="Audit started")

@router.get("/audit/{job_id}")
def get_audit(job_id: str):
    with Session(engine) as session:
        try:
            parsed_id = uuid.UUID(job_id)
        except:
             raise HTTPException(status_code=400, detail="Invalid job ID")
             
        job = session.get(AuditJob, parsed_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
            
        result = None
        if job.status == "complete":
            statement = select(AuditResult).where(AuditResult.job_id == job.id)
            result_obj = session.exec(statement).first()
            if result_obj:
                result = {
                    "overall_score": result_obj.overall_score,
                    "risk_level": result_obj.risk_level,
                    "executive_summary": result_obj.executive_summary,
                    "eeat": result_obj.eeat_findings,
                    "technical": result_obj.technical_findings,
                    "content_patterns": result_obj.content_findings,
                    "action_items": result_obj.action_items,
                }
                
        return {
            "id": job.id,
            "url": job.url,
            "status": job.status,
            "result": result
        }
