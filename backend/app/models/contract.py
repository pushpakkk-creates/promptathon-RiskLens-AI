from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy import JSON
from datetime import datetime

from app.database import Base


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)

    # Core identity
    filename = Column(String, nullable=False)
    document_type = Column(String)
    vendor_name = Column(String)

    # Commercial governance
    contract_value = Column(String)
    currency = Column(String)
    contract_duration_months = Column(Integer)
    emd_amount = Column(String)
    security_deposit_percent = Column(Integer)
    retention_percent = Column(Integer)

    # Decision intelligence
    overall_risk_score = Column(Integer)
    risk_band = Column(String)
    recommendation = Column(String)
    status = Column(String, default="REVIEW")

    # Workflow ownership
    submitted_by = Column(String, nullable=True)
    assigned_manager = Column(String, nullable=True)

    workflow_status = Column(
        String,
        default="AI_ANALYZED"
    )

    analyst_notes = Column(Text, nullable=True)
    manager_notes = Column(Text, nullable=True)

    # Flexible structured intelligence
    procurement_kpis = Column(JSON)
    risk_breakdown = Column(JSON)
    missing_clauses = Column(JSON)
    risk_reasons = Column(JSON)

    # AI narrative
    executive_summary = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    
