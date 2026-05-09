from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.contract import Contract

router = APIRouter()


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    total_contracts = db.query(Contract).count()

    low_risk = db.query(Contract).filter(
        Contract.risk_band == "LOW PROCUREMENT RISK"
    ).count()

    moderate_risk = db.query(Contract).filter(
        Contract.risk_band == "MODERATE PROCUREMENT RISK"
    ).count()

    high_risk = db.query(Contract).filter(
        Contract.risk_band == "HIGH PROCUREMENT RISK"
    ).count()

    critical_risk = db.query(Contract).filter(
        Contract.risk_band == "CRITICAL PROCUREMENT RISK"
    ).count()

    avg_risk = db.query(
        func.avg(Contract.overall_risk_score)
    ).scalar()

    return {
        "total_contracts": total_contracts,
        "low_risk": low_risk,
        "moderate_risk": moderate_risk,
        "high_risk": high_risk,
        "critical_risk": critical_risk,
        "average_risk_score": round(avg_risk or 0, 2)
    }


@router.get("/contracts")
def list_contracts(db: Session = Depends(get_db)):
    contracts = db.query(Contract).order_by(
        Contract.created_at.desc()
    ).all()

    result = []

    for contract in contracts:
        result.append({
            "id": contract.id,
            "filename": contract.filename,
            "document_type": contract.document_type,
            "vendor_name": contract.vendor_name,
            "contract_value": contract.contract_value,
            "currency": contract.currency,
            "overall_risk_score": contract.overall_risk_score,
            "risk_band": contract.risk_band,
            "recommendation": contract.recommendation,
            "status": contract.status,
            "created_at": contract.created_at
        })

    return result


@router.get("/contracts/{contract_id}")
def get_contract_detail(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if not contract:
        return {
            "error": "Contract not found"
        }

    return {
        "id": contract.id,
        "filename": contract.filename,
        "document_type": contract.document_type,
        "vendor_name": contract.vendor_name,
        "contract_value": contract.contract_value,
        "currency": contract.currency,
        "contract_duration_months": contract.contract_duration_months,
        "emd_amount": contract.emd_amount,
        "security_deposit_percent": contract.security_deposit_percent,
        "retention_percent": contract.retention_percent,

        "overall_risk_score": contract.overall_risk_score,
        "risk_band": contract.risk_band,
        "recommendation": contract.recommendation,
        "status": contract.status,

        "procurement_kpis": contract.procurement_kpis,
        "risk_breakdown": contract.risk_breakdown,
        "missing_clauses": contract.missing_clauses,
        "risk_reasons": contract.risk_reasons,

        "executive_summary": contract.executive_summary,

        "created_at": contract.created_at
    }