def calculate_risk(contract_data: dict):
    commercial_score = 0
    operational_score = 0
    legal_score = 0
    vendor_score = 0

    reasons = []

    # -------------------------
    # COMMERCIAL RISK
    # -------------------------

    payment_cycle = contract_data.get("payment_cycle_days", 0)
    retention = contract_data.get("retention_percent", 0)
    security = contract_data.get("security_deposit_percent", 0)
    advance = contract_data.get("advance_payment", False)
    contract_value = contract_data.get("contract_value", "")

    if payment_cycle > 90:
        commercial_score += 25
        reasons.append("Excessively long payment cycle")

    elif payment_cycle > 60:
        commercial_score += 15
        reasons.append("Extended payment cycle")

    if not advance:
        commercial_score += 10
        reasons.append("No advance payment provision")

    if retention >= 10:
        commercial_score += 20
        reasons.append("High retention percentage")

    elif retention >= 5:
        commercial_score += 10
        reasons.append("Moderate retention percentage")

    if security >= 10:
        commercial_score += 15
        reasons.append("High security deposit requirement")

    if not contract_value:
        commercial_score += 10
        reasons.append("Contract value unclear")

    # -------------------------
    # OPERATIONAL RISK
    # -------------------------

    delivery = contract_data.get("delivery_timeline_days", 0)
    sla_response = contract_data.get("sla_response_time_hours", 0)
    uptime = contract_data.get("sla_uptime_percent", 0)
    warranty = contract_data.get("warranty_months", 0)
    maintenance = contract_data.get("maintenance_frequency", "")

    if delivery == 0:
        operational_score += 20
        reasons.append("Delivery timeline not clearly defined")

    elif delivery > 180:
        operational_score += 15
        reasons.append("Potentially unrealistic delivery timeline")

    if sla_response == 0:
        operational_score += 15
        reasons.append("No SLA response commitments")

    if uptime == 0:
        operational_score += 10
        reasons.append("No uptime guarantees")

    if not maintenance:
        operational_score += 10
        reasons.append("Maintenance obligations unclear")

    if warranty == 0:
        operational_score += 15
        reasons.append("Warranty terms missing")

    elif warranty < 12:
        operational_score += 10
        reasons.append("Weak warranty coverage")

    # -------------------------
    # LEGAL RISK
    # -------------------------

    penalty = contract_data.get("penalty_clause_present", False)
    ld = contract_data.get("liquidated_damages_present", False)
    liability = contract_data.get("liability_clause_present", False)
    termination = contract_data.get("termination_clause_present", False)
    force_majeure = contract_data.get("force_majeure_present", False)

    if not penalty:
        legal_score += 20
        reasons.append("Penalty clause missing")

    if not ld:
        legal_score += 15
        reasons.append("Liquidated damages protection missing")

    if not liability:
        legal_score += 25
        reasons.append("Liability protections missing")

    if not termination:
        legal_score += 20
        reasons.append("Termination safeguards missing")

    if not force_majeure:
        legal_score += 20
        reasons.append("Force majeure protection missing")

    # -------------------------
    # VENDOR RISK
    # -------------------------

    turnover = contract_data.get("minimum_turnover_required", "")
    experience = contract_data.get("minimum_experience_years", 0)
    certs = contract_data.get("certifications_required", "")

    if not turnover:
        vendor_score += 15
        reasons.append("Vendor turnover criteria missing")

    if experience == 0:
        vendor_score += 15
        reasons.append("Vendor experience criteria missing")

    if not certs:
        vendor_score += 10
        reasons.append("Vendor certification requirements unclear")

    # Cap individual scores
    commercial_score = min(commercial_score, 100)
    operational_score = min(operational_score, 100)
    legal_score = min(legal_score, 100)
    vendor_score = min(vendor_score, 100)

    # Weighted overall score
    overall = (
        commercial_score * 0.25 +
        operational_score * 0.25 +
        legal_score * 0.35 +
        vendor_score * 0.15
    )

    overall = round(overall)

    # Risk bands + recommendation
    if overall <= 25:
        risk_band = "LOW PROCUREMENT RISK"
        recommendation = "APPROVE"

    elif overall <= 50:
        risk_band = "MODERATE PROCUREMENT RISK"
        recommendation = "REVIEW"

    elif overall <= 75:
        risk_band = "HIGH PROCUREMENT RISK"
        recommendation = "ESCALATE"

    else:
        risk_band = "CRITICAL PROCUREMENT RISK"
        recommendation = "REJECT"

    return {
        "commercial_risk": commercial_score,
        "operational_risk": operational_score,
        "legal_risk": legal_score,
        "vendor_risk": vendor_score,
        "overall_risk_score": overall,
        "risk_band": risk_band,
        "recommendation": recommendation,
        "risk_reasons": reasons
    }