from __future__ import annotations

from email.message import EmailMessage
import smtplib

from app.config import (
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_USE_TLS,
)


def compose_vendor_email(contract, decision: str, notes: str | None = None):
    vendor = contract.vendor_name or "Vendor"
    decision = decision.upper()
    concerns = ", ".join((contract.risk_reasons or [])[:5]) or "No major concerns recorded"

    if decision == "APPROVE":
        subject = f"RiskLens Approval: {contract.filename}"
        body = (
            f"Dear {vendor},\n\n"
            "Your HVAC procurement contract has been approved after AI-assisted risk review "
            "and manager governance approval.\n\n"
            f"Risk band: {contract.risk_band}\n"
            f"Risk score: {contract.overall_risk_score}\n"
            f"Commercial notes: {notes or contract.manager_notes or 'Approved as reviewed.'}\n\n"
            "Regards,\nRiskLens Procurement Team"
        )
    elif decision == "NEGOTIATE":
        subject = f"RiskLens Negotiation Required: {contract.filename}"
        body = (
            f"Dear {vendor},\n\n"
            "Your HVAC procurement submission requires negotiation before approval. "
            "Please revise the highlighted commercial, operational, and legal clauses.\n\n"
            f"Key concerns: {concerns}\n"
            f"Manager notes: {notes or contract.manager_notes or 'Please address the risk report observations.'}\n\n"
            "Regards,\nRiskLens Procurement Team"
        )
    else:
        subject = f"RiskLens Rejection: {contract.filename}"
        body = (
            f"Dear {vendor},\n\n"
            "Your HVAC procurement contract has not been approved in its current form "
            "because the review identified governance or risk gaps.\n\n"
            f"Risk band: {contract.risk_band}\n"
            f"Risk score: {contract.overall_risk_score}\n"
            f"Key concerns: {concerns}\n"
            f"Manager notes: {notes or contract.manager_notes or 'Please refer to the attached risk report.'}\n\n"
            "Regards,\nRiskLens Procurement Team"
        )

    return subject, body


def send_vendor_email(recipient: str, subject: str, body: str):
    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        return {
            "sent": False,
            "status": "draft_ready",
            "reason": "SMTP env is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL.",
        }

    message = EmailMessage()
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        if SMTP_USE_TLS:
            server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(message)

    return {
        "sent": True,
        "status": "sent",
        "reason": "Email sent through configured SMTP service.",
    }
