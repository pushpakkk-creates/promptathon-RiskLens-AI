# app/services/remediation_engine.py

import json
from groq import Groq
from app.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)


def generate_clause_recommendations(
    risk_reasons: list[str],
    missing_clauses: list[str],
    ambiguity_findings: list[dict],
    contract_text: str = "",
) -> dict:
    """
    Takes identified risks, missing clauses, and ambiguities and returns
    actionable fix recommendations with suggested clause language.
    """

    # Build a focused input list — top risks + missing + high-impact ambiguities
    items_to_fix = []

    for reason in risk_reasons[:8]:
        items_to_fix.append({"source": "risk_reason", "text": reason})

    for clause in missing_clauses[:6]:
        items_to_fix.append({"source": "missing_clause", "text": clause})

    for finding in ambiguity_findings:
        if finding.get("risk_impact") == "HIGH" and finding.get("flagged"):
            items_to_fix.append({
                "source": "ambiguity",
                "text": f"{finding.get('clause', '')}: {finding.get('ambiguous_phrase', '')}"
            })

    if not items_to_fix:
        return {
            "recommendations": [],
            "total_recommendations": 0,
            "overall_remediation_priority": "NONE"
        }

    items_json = json.dumps(items_to_fix, indent=2)

    # Optional — send a snippet of the contract text for context
    contract_context = contract_text[:8000] if contract_text else "Contract text not provided."

    prompt = f"""
You are a senior procurement contract legal advisor specializing in HVAC and supply chain contracts.

Below is a list of identified issues in a procurement contract — flagged risks, missing clauses, and ambiguous language.

Your job is to recommend HOW TO FIX each one. Be specific, practical, and fair.

Rules:
- Do NOT just describe the problem — provide actual fix language
- Be legally sound and fair to both parties — do not overcorrect
- Suggest language that can realistically be negotiated
- Identify which party is disadvantaged and how the fix restores balance
- Only HIGH severity issues get aggressive language fixes
- Return ONLY valid JSON — no markdown, no explanation

Issue types to assign:
ONE_SIDED | MISSING_CLAUSE | UNENFORCEABLE | EXCESSIVE_PENALTY | 
UNLIMITED_LIABILITY | VAGUE_OBLIGATION | MISSING_REMEDY | UNFAIR_TERMINATION | RISKY_IP_ASSIGNMENT

Remediation types:
REWRITE | ADD_CLAUSE | DELETE_CLAUSE | ADD_CAP | ADD_CARVEOUT | ADD_MUTUALITY | ADD_CURE_PERIOD

Severity guide:
- HIGH   → exposes a party to unlimited liability, loss of IP, or no legal remedy
- MEDIUM → creates meaningful disadvantage but has workarounds  
- LOW    → suboptimal but unlikely to cause serious harm

Contract context (first 8000 chars):
{contract_context}

Issues to fix:
{items_json}

Return this exact JSON structure:
{{
  "recommendations": [
    {{
      "original_clause": "<the flagged text or clause name>",
      "issue_type": "<issue type from list above>",
      "severity": "<HIGH | MEDIUM | LOW>",
      "disadvantaged_party": "<Vendor | Client | Both | Indeterminate>",
      "what_is_wrong": "<1-2 sentences — the exact problem>",
      "remediation_type": "<remediation type from list above>",
      "suggested_fix": "<the actual rewritten or new clause language — be specific>",
      "negotiation_note": "<how to present this to the other party to get it accepted>",
      "priority_order": <integer 1 = fix first>
    }}
  ],
  "total_recommendations": <integer>,
  "overall_remediation_priority": "<HIGH | MEDIUM | LOW | NONE>"
}}

Sort recommendations by priority_order ascending (most critical first).
Limit to 10 recommendations maximum.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "You are a procurement contract legal advisor. Return strict JSON only. No markdown."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        result = response.choices[0].message.content.strip()

        if result.startswith("```"):
            result = result.replace("```json", "").replace("```", "").strip()

        return json.loads(result)

    except Exception as e:
        return {
            "recommendations": [],
            "total_recommendations": 0,
            "overall_remediation_priority": "NONE",
            "error": str(e)
        }