from groq import Groq
from app.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)


def generate_executive_summary(contract_data: dict, risk_data: dict):
    prompt = f"""
You are a procurement intelligence assistant.

Generate a concise executive summary for procurement stakeholders.

Contract Data:
{contract_data}

Risk Analysis:
{risk_data}

Requirements:
- 3 to 5 sentences
- professional executive tone
- mention key procurement concerns
- mention recommendation
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content