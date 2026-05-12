export type RiskBand =
  | "LOW PROCUREMENT RISK"
  | "MODERATE PROCUREMENT RISK"
  | "HIGH PROCUREMENT RISK"
  | "CRITICAL PROCUREMENT RISK";

export type WorkflowStatus =
  | "AI_ANALYZED"
  | "PENDING_MANAGER_REVIEW"
  | "ESCALATED"
  | "APPROVED"
  | "REJECTED"
  | "SENT_BACK";

export type ProcurementKpis = {
  payment_terms?: string;
  payment_cycle_days?: number;
  advance_payment?: boolean;
  delivery_timeline_days?: number;
  sla_response_time_hours?: number;
  sla_uptime_percent?: number;
  maintenance_frequency?: string;
  warranty_months?: number;
  minimum_turnover_required?: string;
  minimum_experience_years?: number;
  certifications_required?: string;
  scope_summary?: string;
};

export type RiskBreakdown = {
  commercial?: number;
  operational?: number;
  legal?: number;
  vendor?: number;
};

export type ClauseCitation = {
  insight: string;
  type: "risk_reason" | "missing_clause";
  page?: number | null;
  line_start?: number | null;
  line_end?: number | null;
  snippet: string;
  matched_terms?: string[];
  confidence?: string;
};

export type Contract = {
  id: number;
  filename: string;
  document_type: string;
  vendor_name: string;
  contract_value: string;
  currency: string;
  contract_duration_months: number;
  emd_amount: string;
  security_deposit_percent: number;
  retention_percent: number;
  overall_risk_score: number;
  risk_band: RiskBand | string;
  recommendation: string;
  status: string;
  workflow_status: WorkflowStatus | string;
  submitted_by?: string;
  assigned_manager?: string;
  analyst_notes?: string;
  manager_notes?: string;
  procurement_kpis?: ProcurementKpis;
  risk_breakdown?: RiskBreakdown;
  missing_clauses?: string[];
  risk_reasons?: string[];
  clause_citations?: ClauseCitation[];
  executive_summary?: string;
  created_at?: string;
  data_source?: string;
};

export type AnalystDashboardData = {
  total_uploaded: number;
  portfolio_total: number;
  pending_review: number;
  approved: number;
  escalated: number;
  contracts: Contract[];
  data_source?: string;
};

export type ManagerDashboardData = {
  pending_count: number;
  total_reviewed: number;
  approved: number;
  rejected: number;
  approval_queue: Contract[];
  all_contracts: Contract[];
  data_source?: string;
};
