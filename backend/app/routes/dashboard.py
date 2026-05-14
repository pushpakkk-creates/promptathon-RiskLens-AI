from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.contract import Contract
from app.services.citation_engine import (
    build_clause_citations,
    build_fallback_citations,
    load_pages_from_upload,
)

router = APIRouter()


def apply_contract_filters(query, risk_band, document_type, workflow_status):
    if risk_band and risk_band != "ALL":
        query = query.filter(Contract.risk_band == risk_band)

    if document_type and document_type != "ALL":
        query = query.filter(Contract.document_type == document_type)

    if workflow_status and workflow_status != "ALL":
        query = query.filter(Contract.workflow_status == workflow_status)

    return query


def serialize_contract(contract: Contract):
    data = {
        column.name: getattr(contract, column.name)
        for column in Contract.__table__.columns
    }

    kpis = data.get("procurement_kpis") or {}
    citations = kpis.get("clause_citations")

    # FIX 3 — only rebuild if truly missing, not on every request
    if not citations:
        pages = load_pages_from_upload(contract.filename)

        if pages:
            citations = build_clause_citations(
                pages,
                contract.risk_reasons or [],
                contract.missing_clauses or []
            )
        else:
            citations = build_fallback_citations(contract)

    data["clause_citations"] = citations
    data["data_source"] = "supabase"

    return data


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
        "average_risk_score": round(avg_risk or 0, 2),
        "data_source": "supabase"
    }


@router.get("/health")
def dashboard_health(db: Session = Depends(get_db)):
    latest_contract = db.query(Contract).order_by(
        Contract.created_at.desc()
    ).first()

    return {
        "database": "supabase_postgres",
        "connected": True,
        "contracts_count": db.query(Contract).count(),
        "latest_contract_id": latest_contract.id if latest_contract else None,
        "latest_contract_filename": latest_contract.filename if latest_contract else None,
    }


@router.get("/contracts")
def list_contracts(
    risk_band: str | None = Query(default=None),
    document_type: str | None = Query(default=None),
    workflow_status: str | None = Query(default=None),
    # FIX 4 — pagination
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = apply_contract_filters(
        db.query(Contract),
        risk_band,
        document_type,
        workflow_status
    )

    total = query.count()
    contracts = query.order_by(
        Contract.created_at.desc()
    ).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "contracts": contracts
    }


@router.get("/contracts/{contract_id}")
def get_contract_detail(
    contract_id: int,
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

    return serialize_contract(contract)


@router.get("/analyst/{email}")
def analyst_dashboard(
    email: str,
    risk_band: str | None = Query(default=None),
    document_type: str | None = Query(default=None),
    workflow_status: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    # FIX 1 — filter by email in SQL not Python
    all_query = apply_contract_filters(
        db.query(Contract),
        risk_band,
        document_type,
        workflow_status
    )

    my_contracts = all_query.filter(
        Contract.submitted_by == email
    ).order_by(Contract.created_at.desc()).all()

    portfolio_total = all_query.count()

    return {
        "total_uploaded": len(my_contracts),
        "portfolio_total": portfolio_total,
        "pending_review": db.query(Contract).filter(
            Contract.workflow_status == "PENDING_MANAGER_REVIEW"
        ).count(),
        "approved": db.query(Contract).filter(
            Contract.workflow_status == "APPROVED"
        ).count(),
        "escalated": db.query(Contract).filter(
            Contract.workflow_status == "ESCALATED"
        ).count(),
        "contracts": my_contracts,
        "data_source": "supabase"
    }


@router.get("/manager")
def manager_dashboard(
    risk_band: str | None = Query(default=None),
    document_type: str | None = Query(default=None),
    workflow_status: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    queue_statuses = ["PENDING_MANAGER_REVIEW", "ESCALATED"]

    # FIX 2 — single query with status counts, not two full table scans
    all_contracts = apply_contract_filters(
        db.query(Contract),
        risk_band,
        document_type,
        workflow_status
    ).order_by(Contract.created_at.desc()).all()

    approval_queue = [
        c for c in all_contracts
        if c.workflow_status in queue_statuses
    ]

    return {
        "pending_count": len(approval_queue),
        "approval_queue": approval_queue,
        "total_reviewed": sum(
            1 for c in all_contracts
            if c.workflow_status in ["APPROVED", "REJECTED", "SENT_BACK"]
        ),
        "approved": sum(
            1 for c in all_contracts
            if c.workflow_status == "APPROVED"
        ),
        "rejected": sum(
            1 for c in all_contracts
            if c.workflow_status == "REJECTED"
        ),
        "all_contracts": all_contracts,
        "data_source": "supabase"
    }