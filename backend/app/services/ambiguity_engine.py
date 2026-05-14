# app/services/ambiguity_engine.py

import json
from groq import Groq
from app.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)


def detect_ambiguities(text: str) -> dict:
    prompt = f"""
You are a legal contract ambiguity analyst specializing in procurement contracts.

Analyze the contract text below for ambiguous language.

Flag a clause ONLY if you are confident the ambiguity exists 
based on the clause text alone.
Do NOT flag standard legal boilerplate with established meaning.

Ambiguity types to check:
1. VAGUE_QUANTIFIER — no measurable definition
   e.g. "reasonable time", "adequate notice", "sufficient quantity"

2. MULTIPLE_INTERPRETATIONS — phrase can mean two or more things
   e.g. "net 30" (calendar or business days?), "delivery at site" (which site?)

3. UNDEFINED_REFERENCE — unclear who/what is referred to
   e.g. "they shall be liable", "the party must notify"

4. MISSING_PARAMETER — rule stated without threshold or condition
   e.g. "a penalty will apply" (how much?), "subject to approval" (whose?)

5. CONDITIONAL_AMBIGUITY — condition unclear if met or how evaluated
   e.g. "if circumstances change", "in case of unforeseen events"

6. TEMPORAL_AMBIGUITY — time reference with no fixed date
   e.g. "soon", "promptly", "within a reasonable period"

7. CONFLICTING_CLAUSES — two clauses that contradict each other
   (mention both clause references if found)

8. SCOPE_CREEP — language that allows unlimited scope expansion
   e.g. "and any other services as required", "including but not limited to"

Return ONLY valid JSON. No markdown. No explanation.

{{
  "ambiguity_findings": [
    {{
      "clause": "Payment Terms",
      "clause_text": "exact text from contract",
      "flagged": true,
      "type": "TEMPORAL_AMBIGUITY",
      "ambiguous_phrase": "within a reasonable time",
      "interpretations": [
        "Could mean 30 days based on industry standard",
        "Could mean 90 days based on vendor interpretation"
      ],
      "suggested_fix": "Replace with: within 30 calendar days of invoice date",
      "risk_impact": "HIGH"
    }}
  ],
  "total_flagged": 0,
  "ambiguity_risk_level": "HIGH | MEDIUM | LOW | NONE"
}}

Contract text:
{text[:28000]}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "You are a legal contract ambiguity analyst. Return strict JSON only."
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
            "ambiguity_findings": [],
            "total_flagged": 0,
            "ambiguity_risk_level": "NONE",
            "error": str(e)
        }