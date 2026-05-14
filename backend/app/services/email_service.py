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

    # FIX 1 — use actual document type instead of hardcoded HVAC
    doc_type = contract.document_type or "procurement contract"
    concerns = ", ".join((contract.risk_reasons or [])[:5]) or "No major concerns recorded"
    manager_note = notes or contract.manager_notes or ""

    if decision == "APPROVE":
        subject = f"RiskLens Approval: {contract.filename}"
        body = (
            f"Dear {vendor},\n\n"
            f"Your {doc_type} has been approved after AI-assisted risk review "
            f"and manager governance approval.\n\n"
            f"Risk band    : {contract.risk_band}\n"
            f"Risk score   : {contract.overall_risk_score}/100\n"
            f"Notes        : {manager_note or 'Approved as reviewed.'}\n\n"
            "Please proceed as per the agreed terms.\n\n"
            "Regards,\nRiskLens Procurement Team"
        )

    elif decision == "NEGOTIATE":
        subject = f"RiskLens Negotiation Required: {contract.filename}"
        body = (
            f"Dear {vendor},\n\n"
            f"Your {doc_type} submission requires negotiation before approval. "
            "Please revise the highlighted commercial, operational, and legal clauses.\n\n"
            f"Key concerns : {concerns}\n"
            f"Notes        : {manager_note or 'Please address the risk report observations.'}\n\n"
            "Kindly resubmit after incorporating the requested changes.\n\n"
            "Regards,\nRiskLens Procurement Team"
        )

    # FIX 3 — SEND_BACK gets its own clear template
    elif decision == "SEND_BACK":
        subject = f"RiskLens Changes Requested: {contract.filename}"
        body = (
            f"Dear {vendor},\n\n"
            f"Your {doc_type} has been sent back for revisions. "
            "The review identified areas that require clarification or amendment before we can proceed.\n\n"
            f"Key concerns : {concerns}\n"
            f"Notes        : {manager_note or 'Please revise and resubmit.'}\n\n"
            "Kindly address the noted concerns and resubmit at your earliest.\n\n"
            "Regards,\nRiskLens Procurement Team"
        )

    # FIX 3 — ESCALATE gets its own informational template
    elif decision == "ESCALATE":
        subject = f"RiskLens Escalation Notice: {contract.filename}"
        body = (
            f"Dear {vendor},\n\n"
            f"Your {doc_type} has been escalated for senior management review "
            "due to the risk profile identified during AI-assisted analysis.\n\n"
            f"Risk band    : {contract.risk_band}\n"
            f"Risk score   : {contract.overall_risk_score}/100\n"
            f"Key concerns : {concerns}\n"
            f"Notes        : {manager_note or 'Awaiting senior review.'}\n\n"
            "You will be contacted once the review is complete.\n\n"
            "Regards,\nRiskLens Procurement Team"
        )

    else:
        # REJECT — default for unknown decisions too
        subject = f"RiskLens Rejection: {contract.filename}"
        body = (
            f"Dear {vendor},\n\n"
            f"Your {doc_type} has not been approved in its current form "
            "because the review identified governance or risk gaps.\n\n"
            f"Risk band    : {contract.risk_band}\n"
            f"Risk score   : {contract.overall_risk_score}/100\n"
            f"Key concerns : {concerns}\n"
            f"Notes        : {manager_note or 'Please refer to the attached risk report.'}\n\n"
            "Regards,\nRiskLens Procurement Team"
        )

    return subject, body


def send_vendor_email(recipient: str, subject: str, body: str):
    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        return {
            "sent": False,
            "status": "draft_ready",
            "reason": "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD.",
        }

    # FIX 2 — wrap send in try/except so SMTP errors never crash the API
    try:
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

    except smtplib.SMTPAuthenticationError:
        return {
            "sent": False,
            "status": "auth_failed",
            "reason": "SMTP authentication failed. Check SMTP_USERNAME and SMTP_PASSWORD.",
        }

    except smtplib.SMTPException as e:
        return {
            "sent": False,
            "status": "smtp_error",
            "reason": f"SMTP error: {str(e)}",
        }

    except Exception as e:
        return {
            "sent": False,
            "status": "failed",
            "reason": f"Unexpected error: {str(e)}",
        }