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
from app.services.ambiguity_engine import detect_ambiguities
from app.services.remediation_engine import generate_clause_recommendations

router = APIRouter()

# Valid workflow transitions — FIX 4
ALLOWED_TRANSITIONS = {
    "AI_ANALYZED":            ["SUBMIT_FOR_REVIEW", "ESCALATE"],
    "PENDING_MANAGER_REVIEW": ["APPROVE", "REJECT", "SEND_BACK", "ESCALATE"],
    "ESCALATED":              ["APPROVE", "REJECT", "SEND_BACK"],
    "SENT_BACK":              ["SUBMIT_FOR_REVIEW"],
    "APPROVED":               [],
    "REJECTED":               [],
}


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

        # FIX 2 — check for scanned pages
        scanned_count = sum(1 for p in pages if p.get("is_scanned", False))
        total_pages = len(pages)

        text = "\n".join(page["text"] for page in pages)

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

        ambiguity_analysis = detect_ambiguities(text)

        workflow_status = "AI_ANALYZED"
        if risk_analysis["overall_risk_score"] >= 70:
            workflow_status = "ESCALATED"

        # FIX 3 — save file BEFORE db commit
        upload_dir = Path(__file__).resolve().parents[2] / "uploads"
        upload_dir.mkdir(exist_ok=True)

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
            executive_summary=executive_summary,

            ambiguity_findings=ambiguity_analysis.get("ambiguity_findings", []),
    ambiguity_risk_level=ambiguity_analysis.get("ambiguity_risk_level", "NONE"),
    total_ambiguities=ambiguity_analysis.get("total_flagged", 0)
        )

        db.add(contract)
        db.commit()
        db.refresh(contract)

        # FIX 3 — file save after we have contract.id
        safe_name = f"{contract.id}_{file.filename}".replace("/", "_").replace("\\", "_")

        try:
            (upload_dir / safe_name).write_bytes(contents)
            file_saved = True
        except Exception:
            file_saved = False

        return {
            "contract_id": contract.id,
            "filename": contract.filename,
            "workflow_status": contract.workflow_status,
            "message": "Contract analyzed successfully",
            # FIX 2 — surface scanned page warning
            "scanned_pages": scanned_count,
            "total_pages": total_pages,
            "warning": (
                f"{scanned_count} of {total_pages} pages had no readable text — "
                "citations may be incomplete. Re-upload a text-based PDF for full analysis."
            ) if scanned_count > 0 else None
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=404, detail="Contract not found")

    # FIX 4 — validate transition is allowed
    current_status = contract.workflow_status or "AI_ANALYZED"
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])

    if payload.action not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Action '{payload.action}' is not allowed from status '{current_status}'. "
                   f"Allowed actions: {allowed}"
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
        raise HTTPException(status_code=404, detail="Contract not found")

    decision = payload.decision.upper()
    recipient = payload.recipient_email or "vendor@example.com"
    subject, body = compose_vendor_email(contract, decision, payload.notes)

    delivery = (
        send_vendor_email(recipient, subject, body)
        if payload.send
        else {
            "sent": False,
            "status": "draft_ready",
            "reason": "Draft generated. Set send=true to send."
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

# Add this to app/routes/contracts.py
# Place after the existing vendor-mail route, before model-health

# ── Add this import at the top of contracts.py ──
# from app.services.remediation_engine import generate_clause_recommendations


@router.post("/{contract_id}/recommendations")
def generate_recommendations(
    contract_id: int,
    db: Session = Depends(get_db)
):
    """
    On-demand: generate fix recommendations for all flagged risks,
    missing clauses, and high-impact ambiguities in a contract.
    Called when the analyst clicks 'Generate Recommendations' in the UI.
    Results are cached back into the contract row.
    """
    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Return cached result if already generated
    existing = (contract.procurement_kpis or {}).get("recommendations")
    if existing:
        return {
            "contract_id": contract_id,
            "cached": True,
            "recommendations": existing.get("recommendations", []),
            "total_recommendations": existing.get("total_recommendations", 0),
            "overall_remediation_priority": existing.get("overall_remediation_priority", "NONE"),
        }

    # Load original contract text for context
    from app.services.citation_engine import load_pages_from_upload
    pages = load_pages_from_upload(contract.filename)
    contract_text = "\n".join(p.get("text", "") for p in pages) if pages else ""

    result = generate_clause_recommendations(
        risk_reasons=contract.risk_reasons or [],
        missing_clauses=contract.missing_clauses or [],
        ambiguity_findings=contract.ambiguity_findings or [],
        contract_text=contract_text,
    )

    # Cache in procurement_kpis JSON column
    kpis = dict(contract.procurement_kpis or {})
    kpis["recommendations"] = result
    contract.procurement_kpis = kpis
    db.commit()

    return {
        "contract_id": contract_id,
        "cached": False,
        "recommendations": result.get("recommendations", []),
        "total_recommendations": result.get("total_recommendations", 0),
        "overall_remediation_priority": result.get("overall_remediation_priority", "NONE"),
    }


@router.delete("/{contract_id}/recommendations")
def clear_recommendations_cache(
    contract_id: int,
    db: Session = Depends(get_db)
):
    """Clear cached recommendations so they can be regenerated."""
    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    kpis = dict(contract.procurement_kpis or {})
    kpis.pop("recommendations", None)
    contract.procurement_kpis = kpis
    db.commit()

    return {"message": "Recommendations cache cleared."}


@router.get("/model-health")
def model_health():
    return {
        "provider": "Groq",
        "model": "llama-3.3-70b-versatile",
        "api_key_configured": bool(GROQ_API_KEY),
        "status": "configured" if GROQ_API_KEY else "missing_api_key"
    }