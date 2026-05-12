from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.config import GROQ_API_KEY
from app.database import get_db
from app.models.contract import Contract

from app.services.parser import extract_pages_from_pdf
from app.services.extractor import extract_contract_data
from app.services.risk_engine import calculate_risk
from app.services.missing_clause import detect_missing_clauses
from app.services.summary_generator import generate_executive_summary
from app.services.document_validator import validate_document
from app.services.citation_engine import build_clause_citations
from app.services.email_service import compose_vendor_email, send_vendor_email

router = APIRouter()


class WorkflowAction(BaseModel):
    action: str
    notes: str | None = None


class VendorMailRequest(BaseModel):
    decision: str
    recipient_email: str | None = None
    notes: str | None = None
    send: bool = False


@router.post("/upload")
async def upload_contract(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        contents = await file.read()

        pages = extract_pages_from_pdf(contents)

        text = "\n".join(
            page["text"]
            for page in pages
        )

        validation = validate_document(text)

        if not validation["valid"]:
            raise HTTPException(
                status_code=400,
                detail=validation["reason"]
            )

        analysis = extract_contract_data(text)

        risk_analysis = calculate_risk(analysis)

        missing_clause_analysis = detect_missing_clauses(analysis)
        clause_citations = build_clause_citations(
            pages,
            risk_analysis["risk_reasons"],
            missing_clause_analysis["missing_clauses"]
        )

        executive_summary = generate_executive_summary(
            analysis,
            risk_analysis
        )

        workflow_status = "AI_ANALYZED"

        if risk_analysis["overall_risk_score"] >= 70:
            workflow_status = "ESCALATED"

        contract = Contract(
            filename=file.filename,
            document_type=analysis.get("document_type", ""),
            vendor_name=analysis.get("vendor_name", ""),
            contract_value=analysis.get("contract_value", ""),
            currency=analysis.get("currency", "INR"),
            contract_duration_months=analysis.get("contract_duration_months", 0),
            emd_amount=analysis.get("emd_amount", ""),
            security_deposit_percent=analysis.get("security_deposit_percent", 0),
            retention_percent=analysis.get("retention_percent", 0),

            overall_risk_score=risk_analysis["overall_risk_score"],
            risk_band=risk_analysis["risk_band"],
            recommendation=risk_analysis["recommendation"],
            status=risk_analysis["recommendation"],

            submitted_by="analyst@risklens.ai",
            assigned_manager="manager@risklens.ai",
            workflow_status=workflow_status,

            procurement_kpis={
                "payment_terms": analysis.get("payment_terms", ""),
                "payment_cycle_days": analysis.get("payment_cycle_days", 0),
                "advance_payment": analysis.get("advance_payment", False),
                "delivery_timeline_days": analysis.get("delivery_timeline_days", 0),
                "sla_response_time_hours": analysis.get("sla_response_time_hours", 0),
                "sla_uptime_percent": analysis.get("sla_uptime_percent", 0),
                "maintenance_frequency": analysis.get("maintenance_frequency", ""),
                "warranty_months": analysis.get("warranty_months", 0),
                "minimum_turnover_required": analysis.get("minimum_turnover_required", ""),
                "minimum_experience_years": analysis.get("minimum_experience_years", 0),
                "certifications_required": analysis.get("certifications_required", ""),
                "scope_summary": analysis.get("scope_summary", ""),
                "clause_citations": clause_citations
            },

            risk_breakdown={
                "commercial": risk_analysis["commercial_risk"],
                "operational": risk_analysis["operational_risk"],
                "legal": risk_analysis["legal_risk"],
                "vendor": risk_analysis["vendor_risk"]
            },

            missing_clauses=missing_clause_analysis["missing_clauses"],
            risk_reasons=risk_analysis["risk_reasons"],
            executive_summary=executive_summary
        )

        db.add(contract)
        db.commit()
        db.refresh(contract)

        upload_dir = Path(__file__).resolve().parents[2] / "uploads"
        upload_dir.mkdir(exist_ok=True)
        safe_name = f"{contract.id}_{file.filename}".replace("/", "_").replace("\\", "_")
        (upload_dir / safe_name).write_bytes(contents)

        return {
            "contract_id": contract.id,
            "filename": contract.filename,
            "workflow_status": contract.workflow_status,
            "message": "Contract analyzed successfully"
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.patch("/{contract_id}/workflow")
def update_workflow(
    contract_id: int,
    payload: WorkflowAction,
    db: Session = Depends(get_db)
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )

    if payload.action == "SUBMIT_FOR_REVIEW":
        contract.workflow_status = "PENDING_MANAGER_REVIEW"
        contract.analyst_notes = payload.notes

    elif payload.action == "ESCALATE":
        contract.workflow_status = "ESCALATED"
        contract.analyst_notes = payload.notes

    elif payload.action == "APPROVE":
        contract.workflow_status = "APPROVED"
        contract.status = "APPROVED"
        contract.manager_notes = payload.notes

    elif payload.action == "REJECT":
        contract.workflow_status = "REJECTED"
        contract.status = "REJECTED"
        contract.manager_notes = payload.notes

    elif payload.action == "SEND_BACK":
        contract.workflow_status = "SENT_BACK"
        contract.status = "CHANGES_REQUESTED"
        contract.manager_notes = payload.notes

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid workflow action"
        )

    db.commit()
    db.refresh(contract)

    return {
        "message": "Workflow updated successfully",
        "workflow_status": contract.workflow_status
    }


@router.post("/{contract_id}/vendor-mail")
def compose_vendor_mail(
    contract_id: int,
    payload: VendorMailRequest,
    db: Session = Depends(get_db)
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )

    decision = payload.decision.upper()
    recipient = payload.recipient_email or "vendor@example.com"
    subject, body = compose_vendor_email(
        contract,
        decision,
        payload.notes
    )

    delivery = (
        send_vendor_email(recipient, subject, body)
        if payload.send
        else {
            "sent": False,
            "status": "draft_ready",
            "reason": "Draft generated. Set send=true to send through configured SMTP."
        }
    )

    return {
        "recipient": recipient,
        "subject": subject,
        "body": body,
        "delivery_status": delivery["status"],
        "sent": delivery["sent"],
        "delivery_reason": delivery["reason"]
    }


@router.get("/model-health")
def model_health():
    return {
        "provider": "Groq",
        "model": "llama-3.3-70b-versatile",
        "api_key_configured": bool(GROQ_API_KEY),
        "status": "configured" if GROQ_API_KEY else "missing_api_key"
    }
