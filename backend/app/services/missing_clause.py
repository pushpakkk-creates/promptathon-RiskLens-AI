def detect_missing_clauses(contract_data: dict):
    missing = []

    # Commercial
    if not contract_data.get("payment_terms"):
        missing.append("Payment terms clause")

    if not contract_data.get("contract_value"):
        missing.append("Contract value clause")

    # Operational
    if contract_data.get("delivery_timeline_days", 0) == 0:
        missing.append("Delivery timeline clause")

    if contract_data.get("sla_response_time_hours", 0) == 0:
        missing.append("SLA response clause")

    if contract_data.get("sla_uptime_percent", 0) == 0:
        missing.append("Uptime commitment clause")

    if not contract_data.get("maintenance_frequency"):
        missing.append("Maintenance scope clause")

    if contract_data.get("warranty_months", 0) == 0:
        missing.append("Warranty clause")

    # Legal
    if not contract_data.get("penalty_clause_present", False):
        missing.append("Penalty clause")

    if not contract_data.get("liquidated_damages_present", False):
        missing.append("Liquidated damages clause")

    if not contract_data.get("liability_clause_present", False):
        missing.append("Liability clause")

    if not contract_data.get("termination_clause_present", False):
        missing.append("Termination clause")

    if not contract_data.get("force_majeure_present", False):
        missing.append("Force majeure clause")

    # Vendor qualification
    if not contract_data.get("minimum_turnover_required"):
        missing.append("Vendor turnover criteria")

    if contract_data.get("minimum_experience_years", 0) == 0:
        missing.append("Vendor experience criteria")

    if not contract_data.get("certifications_required"):
        missing.append("Vendor certification requirements")

    return {
        "missing_clauses": missing,
        "count": len(missing)
    }