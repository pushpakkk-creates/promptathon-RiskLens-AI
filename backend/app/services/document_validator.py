def validate_document(text: str):
    if not text or len(text.strip()) < 500:
        return {
            "valid": False,
            "reason": "Document appears empty or unreadable."
        }

    content = text.lower()

    procurement_keywords = [
        "contract",
        "agreement",
        "vendor",
        "supplier",
        "tender",
        "purchase",
        "procurement",
        "scope of work",
        "service level",
        "sla",
        "maintenance",
        "amc",
        "payment terms",
        "penalty",
        "delivery",
        "warranty",
        "liability",
        "termination",
        "security deposit",
        "emd"
    ]

    matches = sum(
        1 for keyword in procurement_keywords
        if keyword in content
    )

    if matches >= 3:
        return {
            "valid": True,
            "reason": "Valid procurement contract"
        }

    return {
        "valid": False,
        "reason": "Please upload a procurement contract, tender, SLA, or AMC document."
    }