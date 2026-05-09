from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contract import Contract

from app.services.parser import extract_text_from_pdf
from app.services.extractor import extract_contract_data
from app.services.risk_engine import calculate_risk
from app.services.missing_clause import detect_missing_clauses
from app.services.summary_generator import generate_executive_summary

router = APIRouter()


@router.post("/upload")
async def upload_contract(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        contents = await file.read()

        text = extract_text_from_pdf(contents)

        analysis = extract_contract_data(text)

        risk_analysis = calculate_risk(analysis)

        missing_clause_analysis = detect_missing_clauses(analysis)

        procurement_kpis = {
            "payment_terms": analysis.get("payment_terms"),
            "payment_cycle_days": analysis.get("payment_cycle_days"),
            "advance_payment": analysis.get("advance_payment"),
            "delivery_timeline_days": analysis.get("delivery_timeline_days"),
            "sla_response_time_hours": analysis.get("sla_response_time_hours"),
            "sla_uptime_percent": analysis.get("sla_uptime_percent"),
            "maintenance_frequency": analysis.get("maintenance_frequency"),
            "warranty_months": analysis.get("warranty_months"),
            "minimum_turnover_required": analysis.get("minimum_turnover_required"),
            "minimum_experience_years": analysis.get("minimum_experience_years"),
            "certifications_required": analysis.get("certifications_required"),
            "scope_summary": analysis.get("scope_summary")
        }

        risk_breakdown = {
            "commercial": risk_analysis["commercial_risk"],
            "operational": risk_analysis["operational_risk"],
            "legal": risk_analysis["legal_risk"],
            "vendor": risk_analysis["vendor_risk"]
        }

        executive_summary = generate_executive_summary(
            analysis,
            risk_analysis
        )

        contract = Contract(
            filename=file.filename,
            document_type=analysis.get("document_type"),
            vendor_name=analysis.get("vendor_name"),

            contract_value=analysis.get("contract_value"),
            currency=analysis.get("currency"),
            contract_duration_months=analysis.get("contract_duration_months"),
            emd_amount=analysis.get("emd_amount"),
            security_deposit_percent=analysis.get("security_deposit_percent"),
            retention_percent=analysis.get("retention_percent"),

            overall_risk_score=risk_analysis["overall_risk_score"],
            risk_band=risk_analysis["risk_band"],
            recommendation=risk_analysis["recommendation"],
            status=risk_analysis["recommendation"],

            procurement_kpis=procurement_kpis,
            risk_breakdown=risk_breakdown,
            missing_clauses=missing_clause_analysis["missing_clauses"],
            risk_reasons=risk_analysis["risk_reasons"],

            executive_summary=executive_summary
        )

        db.add(contract)
        db.commit()
        db.refresh(contract)

        return {
            "contract_id": contract.id,
            "filename": file.filename,
            "analysis": analysis,
            "risk_analysis": risk_analysis,
            "missing_clause_analysis": missing_clause_analysis,
            "executive_summary": executive_summary
        }

    except Exception as e:
        return {
            "error": str(e)
        }