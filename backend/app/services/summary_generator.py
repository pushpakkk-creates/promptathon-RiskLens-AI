from groq import Groq
from app.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)


def generate_executive_summary(contract_data: dict, risk_data: dict):

    # Build focused context — only what matters for the summary
    vendor = contract_data.get("vendor_name", "Unknown Vendor")
    doc_type = contract_data.get("document_type", "Contract")
    value = contract_data.get("contract_value", "Not specified")
    currency = contract_data.get("currency", "INR")
    duration = contract_data.get("contract_duration_months", 0)
    scope = contract_data.get("scope_summary", "")

    overall = risk_data.get("overall_risk_score", 0)
    band = risk_data.get("risk_band", "")
    recommendation = risk_data.get("recommendation", "")
    reasons = risk_data.get("risk_reasons", [])

    commercial = risk_data.get("commercial_risk", 0)
    operational = risk_data.get("operational_risk", 0)
    legal = risk_data.get("legal_risk", 0)
    vendor_score = risk_data.get("vendor_risk", 0)

    # FIX 1 — identify dominant risk category
    scores = {
        "Commercial": commercial,
        "Operational": operational,
        "Legal": legal,
        "Vendor": vendor_score
    }
    top_risk_area = max(scores, key=scores.get)

    # FIX 2 — send only the top 5 risk reasons, not all 25 fields
    top_reasons = "\n".join(f"- {r}" for r in reasons[:5])

    prompt = f"""
You are a senior procurement governance analyst writing for a procurement manager.

Write a concise executive summary for the following contract review.

Contract details:
- Document type: {doc_type}
- Vendor: {vendor}
- Value: {currency} {value}
- Duration: {duration} months
- Scope: {scope}

Risk assessment:
- Overall risk score: {overall}/100
- Risk band: {band}
- Recommendation: {recommendation}
- Highest risk area: {top_risk_area} ({scores[top_risk_area]}/100)
- Key concerns:
{top_reasons}

Requirements:
- Exactly 3 to 5 sentences
- Professional executive tone
- Lead with the recommendation and risk band
- Second sentence must mention the highest risk area
- End with the most critical concern the manager must address
- Do NOT use bullet points
- Do NOT repeat the risk score numbers more than once
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": "You are a procurement governance analyst. Write concise, professional executive summaries."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        return response.choices[0].message.content.strip()

    # FIX 3 — never crash the upload if summary fails
    except Exception as e:
        return (
            f"This {doc_type} from {vendor} has been assessed as {band} "
            f"with an overall risk score of {overall}/100. "
            f"Recommendation: {recommendation}. "
            f"Key concerns include: {', '.join(reasons[:3])}."
        )