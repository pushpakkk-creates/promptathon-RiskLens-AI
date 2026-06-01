
# RiskLens AI — Contract Risk Intelligence Platform

<div align="center">

![RiskLens AI](https://img.shields.io/badge/RiskLens-AI%20Powered-003087?style=for-the-badge&logo=shield&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2014-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**AI-powered procurement contract analysis platform **  
*Supply Chain & Vendor Contract Intelligence*

[Features](#-features) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Installation](#-installation) • [Usage](#-usage) • [API Reference](#-api-reference)

</div>

---

## 📌 Problem Statement

Procurement teams at Carrier HVAC review **200+ contracts per year** — AMC agreements, SLAs, vendor tenders, and supply contracts. The current process is:

- ❌ **2–3 working days** per contract reviewed manually
- ❌ Critical clauses missed due to human attention limits
- ❌ No standardized risk scoring across contracts
- ❌ No audit trail for governance and compliance
- ❌ Ambiguous legal language goes undetected until disputes arise

**RiskLens AI solves all of this.** Upload any contract PDF → get a complete risk intelligence report in **under 60 seconds**.

---

## ✨ Features

### 🔍 AI Contract Analysis
- Extracts 20+ structured fields from any procurement PDF using LLM inference
- Handles scanned PDFs via **PyMuPDF + Tesseract OCR** with graceful degradation
- Validates document type before processing — rejects non-procurement documents

### 📊 4-Dimensional Risk Scoring
- **Commercial Risk** (25%) — payment cycle, retention, security deposit, advance payment
- **Operational Risk** (25%) — SLA, uptime, delivery timeline, warranty, maintenance
- **Legal Risk** (35%) — penalty clause, liquidated damages, liability, termination, force majeure
- **Vendor Risk** (15%) — turnover criteria, experience, certifications
- Deterministic weighted formula → explainable **0–100 risk score**
- Risk bands: `LOW` / `MODERATE` / `HIGH` / `CRITICAL`

### 📎 Clause Citation Engine
- Maps every AI-flagged risk to **exact page number and line range** in the original PDF
- Sliding 5-line keyword-scoring window across all document pages
- Confidence levels: `high` / `medium` / `low` / `absence_check`

### ⚡ Ambiguity Detection
Detects **8 types** of vague legal language that cause disputes:

| Type | Example |
|------|---------|
| `TEMPORAL_AMBIGUITY` | "within a reasonable time" |
| `VAGUE_QUANTIFIER` | "adequate notice", "sufficient quantity" |
| `UNDEFINED_REFERENCE` | "they shall be liable" |
| `MISSING_PARAMETER` | "a penalty will apply" (no amount) |
| `CONDITIONAL_AMBIGUITY` | "if circumstances change" |
| `MULTIPLE_INTERPRETATIONS` | "net 30" (calendar vs business days?) |
| `CONFLICTING_CLAUSES` | Two clauses that contradict each other |
| `SCOPE_CREEP` | "and any other services as required" |

Each finding includes: ambiguous phrase, possible interpretations, suggested fix, risk impact level.

### 🔧 Fix Recommendations Panel
- On-demand AI-generated fixes for every flagged risk
- **Rewritten clause language** ready to use in negotiation
- Identifies which party is disadvantaged (`Vendor` / `Client` / `Both`)
- **Negotiation notes** — what to say to the other party to get the fix accepted
- Priority ordering — which clause to fix first
- Results cached so repeat calls are instant

### 🔄 Governance Workflow
State-machine enforcing validated transitions:

```
AI_ANALYZED → SUBMIT_FOR_REVIEW → PENDING_MANAGER_REVIEW
                                        ↓
                          APPROVE / REJECT / SEND_BACK / ESCALATE
```

- Server-side validation — UI cannot bypass workflow rules
- Full audit trail with timestamps and notes
- Role-based views — Analyst dashboard vs Manager dashboard

### 📧 Vendor Email Automation
Auto-drafted emails for every decision type:
- `APPROVE` — approval confirmation with risk score
- `REJECT` — rejection with key concerns listed
- `NEGOTIATE` — revision request with flagged issues
- `SEND_BACK` — change request with manager notes
- `ESCALATE` — escalation notice to vendor

Configurable SMTP sending or draft-only mode.

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | REST API framework |
| **Python 3.11** | Backend language |
| **SQLAlchemy** | ORM |
| **PostgreSQL** (Supabase) | Production database |
| **Groq API** | Ultra-fast LLM inference |
| **Llama 3.3 70B** | Primary LLM model |
| **PyMuPDF (fitz)** | PDF text extraction |
| **Tesseract OCR** | Scanned PDF handling |
| **python-dotenv** | Environment config |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework (App Router) |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Recharts** | Risk visualization charts |
| **Lucide React** | Icons |
| **Axios** | API client |

### AI / LLM
| Model | Use Case |
|-------|---------|
| `llama-3.3-70b-versatile` | Contract extraction, risk analysis, ambiguity detection, fix recommendations, executive summary |
| Fallback chain | `llama-3.1-8b-instant` → `gemma2-9b-it` → `mixtral-8x7b-32768` (auto rate-limit fallback) |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                 │
│  Landing Page → Login → Analyst Dashboard → Contract Detail  │
│                       ↓ Manager Dashboard                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (Axios)
┌──────────────────────▼──────────────────────────────────────┐
│                      BACKEND (FastAPI)                        │
│                                                              │
│  /contracts/upload          /contracts/{id}/workflow         │
│  /contracts/{id}/recommendations   /contracts/{id}/vendor-mail│
│  /dashboard/contracts       /dashboard/manager               │
│  /dashboard/analyst/{email} /dashboard/summary               │
└──────┬───────────────┬──────────────────────────────────────┘
       │               │
┌──────▼──────┐  ┌─────▼──────────────────────────────────────┐
│  PostgreSQL  │  │              AI SERVICES                    │
│  (Supabase)  │  │                                            │
│              │  │  extractor.py      → field extraction       │
│  contracts   │  │  risk_engine.py    → 4D risk scoring        │
│  table       │  │  citation_engine.py→ page/line mapping      │
│              │  │  ambiguity_engine.py→ vague language detect │
└──────────────┘  │  remediation_engine.py→ fix recommendations│
                  │  summary_generator.py → executive summary   │
                  │  missing_clause.py → clause checklist       │
                  │  document_validator.py→ doc type check      │
                  │  email_service.py  → vendor communication   │
                  │  parser.py         → PDF + OCR extraction   │
                  └────────────────────────────────────────────┘
```

### PDF Processing Pipeline

```
Upload PDF
    │
    ▼
PyMuPDF extract text
    │
    ├── Text found? ──→ Use text directly
    │
    └── Empty page? ──→ Tesseract OCR (2x resolution)
    │
    ▼
Document Validator (min 500 chars + 3 procurement keywords)
    │
    ▼
LLM Extraction (20+ fields → structured JSON)
    │
    ├──→ Risk Engine (4D scoring)
    ├──→ Missing Clause Detection
    ├──→ Citation Engine (page/line mapping)
    ├──→ Ambiguity Detection
    ├──→ Executive Summary Generation
    └──→ Store in PostgreSQL
```

---

## 📁 Project Structure

```
promptathon-RiskLens-AI/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── contract.py          # SQLAlchemy model
│   │   ├── routes/
│   │   │   ├── contracts.py         # Upload, workflow, vendor mail, recommendations
│   │   │   └── dashboard.py         # Summary, list, analyst, manager endpoints
│   │   ├── services/
│   │   │   ├── parser.py            # PDF + OCR extraction
│   │   │   ├── extractor.py         # LLM field extraction (with fallback chain)
│   │   │   ├── risk_engine.py       # 4D weighted risk scoring
│   │   │   ├── missing_clause.py    # Clause checklist detection
│   │   │   ├── citation_engine.py   # Page/line citation mapping
│   │   │   ├── ambiguity_engine.py  # 8-type ambiguity detection
│   │   │   ├── remediation_engine.py# Fix recommendations with negotiation notes
│   │   │   ├── summary_generator.py # Executive summary generation
│   │   │   ├── document_validator.py# Procurement document validation
│   │   │   └── email_service.py     # Vendor email drafting and sending
│   │   ├── config.py                # Environment variables
│   │   ├── database.py              # SQLAlchemy + Supabase setup
│   │   └── main.py                  # FastAPI app entry point
│   ├── uploads/                     # Stored contract PDFs
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx             # Landing page
    │   │   ├── login/page.tsx       # Role-based login
    │   │   ├── analyst/dashboard/page.tsx
    │   │   ├── manager/dashboard/page.tsx
    │   │   └── contracts/[id]/page.tsx  # Contract detail + all tabs
    │   ├── components/
    │   │   ├── AppShell.tsx         # Sidebar + layout
    │   │   ├── DashboardPrimitives.tsx # StatCard, Badge, ContractTable, FilterSelect
    │   │   └── Sidebar.tsx
    │   └── lib/
    │       ├── api.ts               # Axios instance
    │       ├── risk.ts              # Risk band helpers
    │       └── types.ts             # TypeScript interfaces
    ├── public/
    ├── package.json
    └── tailwind.config.ts
```

---

## ⚙️ Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (or Supabase account — free tier works)
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Tesseract OCR installed on your system

#### Install Tesseract
```bash
# Windows
# Download installer from: https://github.com/UB-Mannheim/tesseract/wiki

# macOS
brew install tesseract

# Ubuntu / Debian
sudo apt install tesseract-ocr
```

---

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/promptathon-RiskLens-AI.git
cd promptathon-RiskLens-AI/backend

# 2. Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env file
cp .env.example .env
```

Edit `.env`:
```env
# Required
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional — for vendor email sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_USE_TLS=true
```

```bash
# 5. Start the backend
uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs at: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
# In a new terminal
cd promptathon-RiskLens-AI/frontend

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start the frontend
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

## 🚀 Usage

### 1. Login
- Open `http://localhost:3000`
- Click **Login**
- Select role: **Analyst** or **Manager**
- Use any email and click Login (demo mode)

### 2. Upload a Contract (Analyst)
- Go to **Upload** tab in the analyst dashboard
- Drag and drop any procurement PDF (AMC, SLA, tender, vendor agreement)
- Wait ~30–60 seconds for full AI analysis
- Automatically redirected to the contract detail page

### 3. Review Analysis (Contract Detail Page)

| Tab | What you see |
|-----|-------------|
| **Overview** | Risk score, risk breakdown chart, hover-to-switch KPI panel |
| **Risk Insights** | Cited evidence with page/line references, missing clauses, ambiguity detection |
| **Document KPIs** | All 20+ extracted fields — payment, SLA, warranty, vendor criteria |
| **Fix Recommendations** | Click "Generate Recommendations" → AI-drafted clause fixes with negotiation notes |

### 4. Workflow Actions

**As Analyst:**
- `Submit to Manager` — sends contract to manager review queue
- `Escalate` — fast-tracks to senior review (auto-triggered for score ≥ 70)

**As Manager:**
- `Approve` — records approval with notes
- `Send Back` — requests revisions
- `Reject` — records rejection with reasons

### 5. Vendor Communication
- Go to contract detail page
- Use vendor mail endpoint to draft or send decision emails

---

## 📡 API Reference

### Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/contracts/upload` | Upload and analyze a contract PDF |
| `PATCH` | `/contracts/{id}/workflow` | Update workflow status |
| `POST` | `/contracts/{id}/vendor-mail` | Draft or send vendor email |
| `POST` | `/contracts/{id}/recommendations` | Generate fix recommendations |
| `DELETE` | `/contracts/{id}/recommendations` | Clear cached recommendations |
| `GET` | `/contracts/model-health` | Check LLM configuration |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dashboard/summary` | Portfolio-level risk summary |
| `GET` | `/dashboard/contracts` | List all contracts (paginated, filterable) |
| `GET` | `/dashboard/contracts/{id}` | Full contract detail |
| `GET` | `/dashboard/analyst/{email}` | Analyst-specific dashboard |
| `GET` | `/dashboard/manager` | Manager approval queue |
| `GET` | `/dashboard/health` | Database health check |

### Example: Upload Contract

```bash
curl -X POST http://localhost:8000/contracts/upload \
  -F "file=@contract.pdf"
```

**Response:**
```json
{
  "contract_id": 42,
  "filename": "vendor_amc_2024.pdf",
  "workflow_status": "AI_ANALYZED",
  "message": "Contract analyzed successfully",
  "scanned_pages": 0,
  "total_pages": 10,
  "warning": null
}
```

### Example: Workflow Update

```bash
curl -X PATCH http://localhost:8000/contracts/42/workflow \
  -H "Content-Type: application/json" \
  -d '{"action": "SUBMIT_FOR_REVIEW", "notes": "Ready for manager review"}'
```

### Example: Generate Recommendations

```bash
curl -X POST http://localhost:8000/contracts/42/recommendations
```

**Response:**
```json
{
  "contract_id": 42,
  "cached": false,
  "total_recommendations": 8,
  "overall_remediation_priority": "HIGH",
  "recommendations": [
    {
      "original_clause": "Liability protections missing",
      "issue_type": "UNLIMITED_LIABILITY",
      "severity": "HIGH",
      "disadvantaged_party": "Vendor",
      "what_is_wrong": "Vendor bears unlimited liability while client liability is capped at invoice value.",
      "remediation_type": "ADD_CAP",
      "suggested_fix": "Add: 'The total liability of either party under this Contract shall not exceed the total contract value of INR 4,20,00,000.'",
      "negotiation_note": "Present this as standard industry practice — most contracts cap liability at contract value for both parties.",
      "priority_order": 1
    }
  ]
}
```

---

## 🔒 Workflow State Machine

```
                    ┌─────────────┐
                    │ AI_ANALYZED │  ← initial state after upload
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
   SUBMIT_FOR_REVIEW              ESCALATE
              │                         │
              ▼                         ▼
  ┌──────────────────────┐      ┌──────────────┐
  │ PENDING_MANAGER_REVIEW│      │   ESCALATED   │
  └──────────┬───────────┘      └──────┬───────┘
             │                         │
    ┌────────┼─────────┐      ┌────────┼────────┐
    ▼        ▼         ▼      ▼        ▼        ▼
APPROVE   REJECT   SEND_BACK APPROVE REJECT SEND_BACK
    │        │         │
    ▼        ▼         ▼
APPROVED  REJECTED  SENT_BACK → SUBMIT_FOR_REVIEW (loop)
 (final)  (final)
```

**Invalid transitions return HTTP 400** with allowed actions listed.

---

## 🧠 Risk Scoring Formula

```
Overall Score = (Commercial × 0.25) + (Operational × 0.25) + (Legal × 0.35) + (Vendor × 0.15)

Risk Bands:
  0  – 25  →  LOW PROCUREMENT RISK       →  APPROVE
  26 – 50  →  MODERATE PROCUREMENT RISK  →  REVIEW
  51 – 75  →  HIGH PROCUREMENT RISK      →  ESCALATE
  76 – 100 →  CRITICAL PROCUREMENT RISK  →  REJECT

Auto-escalation: contracts scoring ≥ 70 are set to ESCALATED workflow status on upload.
```

---

## 🌟 Key Design Decisions

**Why deterministic scoring instead of LLM scoring?**  
LLM scores are non-deterministic — the same contract can get different scores across runs. Our approach separates concerns: LLM handles extraction (language understanding), rule engine handles scoring (deterministic math). Every point is explainable and auditable.

**Why on-demand recommendations instead of auto-generating on upload?**  
Keeps upload fast (60 seconds). Recommendations add ~5–8 seconds and aren't needed for every contract. Results are cached so the second visit is instant.

**Why a fallback model chain?**  
Groq's free tier has daily token limits. The extractor automatically falls through `llama-3.3-70b → llama-3.1-8b-instant → gemma2-9b-it → mixtral-8x7b-32768` on rate limit errors, so the system never goes down during a demo or heavy usage day.

**Why citation engine instead of just showing the risk reason?**  
Procurement managers need to verify findings. Showing page 5, lines 14–18 with the exact contract text builds trust — this is not a black box. Every flag is traceable to source.

---

## 🔮 Future Scope

| Feature | Description |
|---------|-------------|
| **Contract Comparison** | Upload two vendor bids → clause-by-clause comparison |
| **Chat with Contract** | RAG-based Q&A — "What is the penalty for late delivery?" |
| **Contract Expiry Tracking** | Auto-reminders 60 days before renewal |
| **SAP / ERP Integration** | Auto-populate vendor master data from extraction |
| **Multi-language Support** | German, Spanish, Mandarin contracts → English summaries |
| **Predictive Dispute Risk** | Train on historical contracts → predict dispute probability |
| **AI Contract Drafting** | Generate full contract from scope + budget + vendor type |
| **Vendor Risk Enrichment** | Pull GST filings, court records, financial data externally |

---

## 👥 Team
- Pushpak Shende
- Nileshwari Gawande
- Astha Pande
- Abhishekraj Singh
- Kanak Agrawal
---

