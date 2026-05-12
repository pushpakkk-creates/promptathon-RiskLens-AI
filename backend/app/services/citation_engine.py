from __future__ import annotations

from pathlib import Path
import re

from app.services.parser import extract_pages_from_pdf


RISK_KEYWORDS = {
    "payment": ["payment", "invoice", "advance", "mobilization", "cycle"],
    "retention": ["retention", "withheld", "deduct"],
    "security": ["security deposit", "performance security", "bank guarantee"],
    "delivery": ["delivery", "completion", "timeline", "milestone"],
    "sla": ["sla", "response", "uptime", "service level"],
    "maintenance": ["maintenance", "amc", "preventive", "corrective"],
    "warranty": ["warranty", "defect liability", "guarantee"],
    "penalty": ["penalty", "liquidated damages", "ld"],
    "liability": ["liability", "indemnity", "damages"],
    "termination": ["termination", "terminate"],
    "force": ["force majeure", "act of god"],
    "turnover": ["turnover", "financial capacity", "revenue"],
    "experience": ["experience", "similar work", "years"],
    "certification": ["certification", "iso", "oem", "license"],
}


def build_clause_citations(
    pages: list[dict],
    risk_reasons: list[str],
    missing_clauses: list[str],
    max_items: int = 12,
):
    citations = []

    for reason in risk_reasons[:max_items]:
        citation = find_best_citation(pages, reason)
        citation["insight"] = reason
        citation["type"] = "risk_reason"
        citations.append(citation)

    remaining = max_items - len(citations)

    for clause in missing_clauses[:remaining]:
        citations.append({
            "insight": clause,
            "type": "missing_clause",
            "page": None,
            "line_start": None,
            "line_end": None,
            "snippet": "No matching clause language was found in the parsed contract text.",
            "matched_terms": terms_for_text(clause),
            "confidence": "absence_check",
        })

    return citations


def find_best_citation(pages: list[dict], insight: str):
    terms = terms_for_text(insight)
    best = None
    best_score = 0

    for page in pages:
        lines = clean_lines(page.get("text", ""))

        for index in range(len(lines)):
            window = lines[index:index + 3]
            snippet = " ".join(window)
            score = score_snippet(snippet, terms)

            if score > best_score:
                best_score = score
                best = {
                    "page": page.get("page"),
                    "line_start": index + 1,
                    "line_end": index + len(window),
                    "snippet": snippet[:700],
                    "matched_terms": [term for term in terms if term in snippet.lower()],
                }

    if best:
        best["confidence"] = "high" if best_score >= 2 else "medium"
        return best

    return {
        "page": None,
        "line_start": None,
        "line_end": None,
        "snippet": "Relevant wording was not found in the stored document text. Re-upload this contract to refresh line-level citations.",
        "matched_terms": terms,
        "confidence": "low",
    }


def build_fallback_citations(contract, max_items: int = 12):
    kpis = contract.procurement_kpis or {}
    pseudo_pages = [{
        "page": 1,
        "text": "\n".join([
            str(kpis.get("payment_terms", "")),
            str(kpis.get("scope_summary", "")),
            f"Delivery timeline: {kpis.get('delivery_timeline_days', 0)} days",
            f"SLA response: {kpis.get('sla_response_time_hours', 0)} hours",
            f"Uptime: {kpis.get('sla_uptime_percent', 0)} percent",
            f"Warranty: {kpis.get('warranty_months', 0)} months",
            f"Vendor turnover: {kpis.get('minimum_turnover_required', '')}",
            f"Experience: {kpis.get('minimum_experience_years', 0)} years",
            str(kpis.get("certifications_required", "")),
            contract.executive_summary or "",
        ])
    }]

    return build_clause_citations(
        pseudo_pages,
        contract.risk_reasons or [],
        contract.missing_clauses or [],
        max_items=max_items,
    )


def load_pages_from_upload(filename: str):
    if not filename:
        return []

    uploads = Path(__file__).resolve().parents[2] / "uploads"
    candidates = [
        path for path in uploads.glob("*")
        if path.is_file()
        and (
            path.name.lower() == filename.lower()
            or path.name.lower().endswith(f"_{filename.lower()}")
        )
    ]

    if not candidates:
        return []

    try:
        return extract_pages_from_pdf(candidates[0].read_bytes())
    except Exception:
        return []


def terms_for_text(text: str):
    lowered = text.lower()
    terms = []

    for key, values in RISK_KEYWORDS.items():
        if key in lowered or any(value in lowered for value in values):
            terms.extend(values)

    if not terms:
        terms = [
            word for word in re.findall(r"[a-zA-Z]{5,}", lowered)
            if word not in {"missing", "unclear", "clause", "criteria", "terms"}
        ][:4]

    return list(dict.fromkeys(terms))


def clean_lines(text: str):
    return [
        re.sub(r"\s+", " ", line).strip()
        for line in text.splitlines()
        if re.sub(r"\s+", " ", line).strip()
    ]


def score_snippet(snippet: str, terms: list[str]):
    lowered = snippet.lower()
    return sum(1 for term in terms if term in lowered)
