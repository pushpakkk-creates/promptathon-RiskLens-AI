import json

from groq import Groq

from app.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)


def extract_contract_data(text: str):
    prompt = f"""
You are a procurement contract intelligence analyst.

Extract ONLY procurement-relevant structured data.

Return ONLY VALID JSON.
NO markdown.
NO explanation.
NO extra text.

JSON format:

{{
  "document_type": "",
  "vendor_name": "",

  "contract_value": "",
  "currency": "",

  "payment_terms": "",
  "payment_cycle_days": 0,
  "advance_payment": false,

  "emd_amount": "",
  "security_deposit_percent": 0,
  "retention_percent": 0,

  "contract_duration_months": 0,
  "renewal_clause": false,

  "delivery_timeline_days": 0,

  "sla_response_time_hours": 0,
  "sla_uptime_percent": 0,
  "maintenance_frequency": "",

  "penalty_clause_present": false,
  "liquidated_damages_present": false,

  "warranty_months": 0,

  "liability_clause_present": false,
  "termination_clause_present": false,
  "force_majeure_present": false,

  "minimum_turnover_required": "",
  "minimum_experience_years": 0,
  "certifications_required": "",

  "scope_summary": ""
}}

Rules:
- document_type = SLA / AMC / Tender / Other
- missing values = empty string / 0 / false
- JSON ONLY

Document:
{text[:60000]}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": "You return strict JSON only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    result = response.choices[0].message.content.strip()

    print("RAW GROQ OUTPUT:")
    print(result)

    if result.startswith("```"):
        result = result.replace("```json", "").replace("```", "").strip()

    return json.loads(result)
