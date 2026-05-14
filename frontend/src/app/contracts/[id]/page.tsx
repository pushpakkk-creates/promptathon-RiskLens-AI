"use client";

import { Badge, StatCard } from "@/components/DashboardPrimitives";
import api from "@/lib/api";
import { formatLabel, riskTone, workflowTone } from "@/lib/risk";
import type { ClauseCitation, Contract, RiskBreakdown } from "@/lib/types";
import { AxiosError } from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  Gauge,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldAlert,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "clauses" | "document" | "recommendations";

type VendorMail = {
  recipient: string;
  subject: string;
  body: string;
  delivery_status: string;
  sent?: boolean;
  delivery_reason?: string;
};

type AmbiguityFinding = {
  clause: string;
  clause_text: string;
  flagged: boolean;
  type: string;
  ambiguous_phrase: string;
  interpretations: string[];
  suggested_fix: string;
  risk_impact: "HIGH" | "MEDIUM" | "LOW";
};

type Recommendation = {
  original_clause: string;
  issue_type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  disadvantaged_party: "Vendor" | "Client" | "Both" | "Indeterminate";
  what_is_wrong: string;
  remediation_type: string;
  suggested_fix: string;
  negotiation_note: string;
  priority_order: number;
};

type RecommendationsResponse = {
  contract_id: number;
  cached: boolean;
  recommendations: Recommendation[];
  total_recommendations: number;
  overall_remediation_priority: string;
};

// ─── Tab config ──────────────────────────────────────────────────────────────

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "clauses", label: "Risk Insights" },
  { id: "document", label: "Document KPIs" },
  { id: "recommendations", label: "Fix Recommendations" },
];

// ─── Style helpers ────────────────────────────────────────────────────────────

function ambiguityTypeTone(type: string): string {
  const tones: Record<string, string> = {
    VAGUE_QUANTIFIER: "bg-amber-100 text-amber-700 border-amber-200",
    MULTIPLE_INTERPRETATIONS: "bg-purple-100 text-purple-700 border-purple-200",
    UNDEFINED_REFERENCE: "bg-blue-100 text-blue-700 border-blue-200",
    MISSING_PARAMETER: "bg-red-100 text-red-700 border-red-200",
    CONDITIONAL_AMBIGUITY: "bg-orange-100 text-orange-700 border-orange-200",
    TEMPORAL_AMBIGUITY: "bg-cyan-100 text-cyan-700 border-cyan-200",
    CONFLICTING_CLAUSES: "bg-rose-100 text-rose-700 border-rose-200",
    SCOPE_CREEP: "bg-violet-100 text-violet-700 border-violet-200",
  };
  return tones[type] || "bg-slate-100 text-slate-700 border-slate-200";
}

function impactTone(impact: string): string {
  if (impact === "HIGH") return "bg-red-600 text-white";
  if (impact === "MEDIUM") return "bg-amber-500 text-white";
  return "bg-emerald-600 text-white";
}

function ambiguityRiskLevelTone(level: string): string {
  if (level === "HIGH") return "border-red-200 bg-red-50 text-red-700";
  if (level === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700";
  if (level === "LOW") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function severityStyle(severity: string) {
  if (severity === "HIGH")   return "bg-red-100 text-red-700 border-red-200";
  if (severity === "MEDIUM") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function issueTypeStyle(type: string) {
  const map: Record<string, string> = {
    ONE_SIDED:           "bg-orange-100 text-orange-700 border-orange-200",
    MISSING_CLAUSE:      "bg-red-100 text-red-700 border-red-200",
    UNENFORCEABLE:       "bg-purple-100 text-purple-700 border-purple-200",
    EXCESSIVE_PENALTY:   "bg-rose-100 text-rose-700 border-rose-200",
    UNLIMITED_LIABILITY: "bg-red-100 text-red-700 border-red-200",
    VAGUE_OBLIGATION:    "bg-amber-100 text-amber-700 border-amber-200",
    MISSING_REMEDY:      "bg-blue-100 text-blue-700 border-blue-200",
    UNFAIR_TERMINATION:  "bg-pink-100 text-pink-700 border-pink-200",
    RISKY_IP_ASSIGNMENT: "bg-violet-100 text-violet-700 border-violet-200",
  };
  return map[type] || "bg-slate-100 text-slate-700 border-slate-200";
}

function remediationTypeStyle(type: string) {
  const map: Record<string, string> = {
    REWRITE:         "bg-blue-600 text-white",
    ADD_CLAUSE:      "bg-emerald-600 text-white",
    DELETE_CLAUSE:   "bg-red-600 text-white",
    ADD_CAP:         "bg-amber-600 text-white",
    ADD_CARVEOUT:    "bg-purple-600 text-white",
    ADD_MUTUALITY:   "bg-teal-600 text-white",
    ADD_CURE_PERIOD: "bg-sky-600 text-white",
  };
  return map[type] || "bg-slate-600 text-white";
}

function priorityBannerStyle(priority: string) {
  if (priority === "HIGH")   return "border-red-200 bg-red-50 text-red-700";
  if (priority === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700";
  if (priority === "LOW")    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContractPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contractId = params.id;

  const [contract, setContract] = useState<Contract | null>(null);
  const [active, setActive] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [role] = useState<"analyst" | "manager">(() => {
    if (typeof window === "undefined") return "analyst";
    return localStorage.getItem("role") === "manager" ? "manager" : "analyst";
  });
  const [error, setError] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState<string>("Commercial");

  // Recommendations state
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recoMeta, setRecoMeta] = useState<{
    priority: string;
    total: number;
    cached: boolean;
  } | null>(null);
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoError, setRecoError] = useState("");

  const fetchContract = useCallback(async () => {
    const response = await api.get<Contract>(`/dashboard/contracts/${contractId}`);
    setContract(response.data);
  }, [contractId]);

  useEffect(() => {
    fetchContract().catch((fetchError: unknown) => {
      console.error(fetchError);
      setError("Unable to load contract intelligence.");
    });
  }, [fetchContract]);

  const fetchRecommendations = async (force = false) => {
    try {
      setRecoLoading(true);
      setRecoError("");

      if (force) {
        await api.delete(`/contracts/${contractId}/recommendations`);
      }

      const response = await api.post<RecommendationsResponse>(
        `/contracts/${contractId}/recommendations`
      );
      setRecommendations(response.data.recommendations || []);
      setRecoMeta({
        priority: response.data.overall_remediation_priority,
        total: response.data.total_recommendations,
        cached: response.data.cached,
      });
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setRecoError(axiosError.response?.data?.detail || "Failed to generate recommendations.");
    } finally {
      setRecoLoading(false);
    }
  };

  const riskData = useMemo(() => {
    const risk: RiskBreakdown = contract?.risk_breakdown || {};
    return [
      { name: "Commercial", value: risk.commercial || 0 },
      { name: "Operational", value: risk.operational || 0 },
      { name: "Legal", value: risk.legal || 0 },
      { name: "Vendor", value: risk.vendor || 0 },
    ];
  }, [contract?.risk_breakdown]);

  const updateWorkflow = async (action: string) => {
    try {
      setLoading(true);
      setError("");
      await api.patch(`/contracts/${contractId}/workflow`, {
        action,
        notes: `${formatLabel(action)} by ${role}`,
      });
      await fetchContract();
    } catch (workflowError: unknown) {
      const axiosError = workflowError as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || "Workflow update failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!contract) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] text-sm font-black text-[var(--ink-blue)]">
        {error || "Loading contract intelligence"}
      </main>
    );
  }

  const kpis = contract.procurement_kpis || {};
  const missingClauses = contract.missing_clauses || [];
  const riskReasons = contract.risk_reasons || [];
  const citations = contract.clause_citations || [];
  const ambiguityFindings: AmbiguityFinding[] = (contract as any).ambiguity_findings || [];
  const ambiguityRiskLevel: string = (contract as any).ambiguity_risk_level || "NONE";
  const totalAmbiguities: number = (contract as any).total_ambiguities || 0;

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-slate-950 sm:px-8 lg:px-10">
      <button
        className="mb-5 inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm font-black text-[var(--ink-blue)]"
        onClick={() => router.push(role === "manager" ? "/manager/dashboard" : "/analyst/dashboard")}
        type="button"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </button>

      {/* ── Header card ── */}
      <section className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
        <div className="grid gap-8 xl:grid-cols-[1fr_330px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--carrier-blue)]">
              Contract RL-{contract.id}
            </p>
            <h1 className="mt-2 text-4xl font-black text-[var(--ink-blue)]">
              {contract.filename.replace(/_/g, " ").replace(".pdf", "")}
            </h1>
            <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-slate-700">
              {contract.executive_summary || "AI executive summary will appear after analysis."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge value={contract.vendor_name || "Vendor unspecified"} />
              <Badge value={contract.document_type || "Other"} />
              <Badge tone={riskTone(contract.risk_band)} value={contract.risk_band} />
              <Badge tone={workflowTone(contract.workflow_status)} value={contract.workflow_status} />
              {totalAmbiguities > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  <Zap size={11} />
                  {totalAmbiguities} Ambiguit{totalAmbiguities === 1 ? "y" : "ies"} Detected
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Overall Risk Score</p>
            <p className="mt-3 text-8xl font-black text-[var(--ink-blue)]">{contract.overall_risk_score || 0}</p>
            <p className="mt-4 text-lg font-black text-slate-700">Recommendation</p>
            <p className="mt-1 text-2xl font-black text-[var(--carrier-blue)]">{formatLabel(contract.recommendation)}</p>
            <div className="mt-4">
              <span className={`inline-flex items-center rounded-full border px-7 py-5 text-base font-black ${riskTone(contract.risk_band)}`}>
                {formatLabel(contract.risk_band)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {role === "analyst" ? (
            <>
              <ActionButton disabled={loading} icon={<Send size={17} />} label="Submit to manager" onClick={() => updateWorkflow("SUBMIT_FOR_REVIEW")} tone="primary" />
              <ActionButton disabled={loading} icon={<ShieldAlert size={17} />} label="Escalate" onClick={() => updateWorkflow("ESCALATE")} tone="warning" />
            </>
          ) : (
            <>
              <ActionButton disabled={loading} icon={<CheckCircle2 size={17} />} label="Approve" onClick={() => updateWorkflow("APPROVE")} tone="success" />
              <ActionButton disabled={loading} icon={<RotateCcw size={17} />} label="Send back" onClick={() => updateWorkflow("SEND_BACK")} tone="warning" />
              <ActionButton disabled={loading} icon={<XCircle size={17} />} label="Reject" onClick={() => updateWorkflow("REJECT")} tone="danger" />
            </>
          )}
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
        ) : null}
      </section>

      {/* ── Tab bar ── */}
      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-blue-100">
        {tabs.map((tab) => (
          <button
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-black transition ${
              active === tab.id
                ? "border-[var(--carrier-blue)] text-[var(--ink-blue)]"
                : "border-transparent text-slate-500"
            }`}
            key={tab.id}
            onClick={() => setActive(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {active === "overview" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <Panel icon={<Gauge size={20} />} title="Risk breakdown">
            <div className="h-80 min-h-80 min-w-0">
              <ResponsiveContainer height="100%" minHeight={320} minWidth={240} width="100%">
                <BarChart
                  data={riskData}
                  onMouseMove={(state) => {
                    if (state.activeLabel) setHoveredCategory(state.activeLabel);
                  }}
                >
                  <CartesianGrid stroke="#dbeafe" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} />
                  <YAxis domain={[0, 100]} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#005da8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel icon={<FileSearch size={20} />} title={`${hoveredCategory} KPIs`}>
            {hoveredCategory === "Commercial" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard label="Contract Value" value={contract.contract_value ? `${contract.currency || "INR"} ${contract.contract_value}` : "Not specified"} />
                <StatCard label="Duration" value={contract.contract_duration_months ? `${contract.contract_duration_months} months` : "Not specified"} />
                <StatCard label="Security Deposit" value={contract.security_deposit_percent ? `${contract.security_deposit_percent}%` : "Not specified"} />
                <StatCard label="Retention" value={contract.retention_percent ? `${contract.retention_percent}%` : "Not specified"} />
              </div>
            )}
            {hoveredCategory === "Operational" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard label="SLA Response" value={kpis.sla_response_time_hours ? `${kpis.sla_response_time_hours} hours` : "Not specified"} />
                <StatCard label="Uptime SLA" value={kpis.sla_uptime_percent ? `${kpis.sla_uptime_percent}%` : "Not specified"} />
                <StatCard label="Delivery Timeline" value={kpis.delivery_timeline_days ? `${kpis.delivery_timeline_days} days` : "Not specified"} />
                <StatCard label="Maintenance" value={kpis.maintenance_frequency || "Not specified"} />
              </div>
            )}
            {hoveredCategory === "Legal" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard label="Warranty" value={kpis.warranty_months ? `${kpis.warranty_months} months` : "Not specified"} />
                <StatCard label="Payment Terms" value={kpis.payment_terms || "Not specified"} />
                <StatCard label="Payment Cycle" value={kpis.payment_cycle_days ? `${kpis.payment_cycle_days} days` : "Not specified"} />
                <StatCard label="Scope" value={kpis.scope_summary || "Not specified"} />
              </div>
            )}
            {hoveredCategory === "Vendor" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard label="Min Turnover" value={kpis.minimum_turnover_required || "Not specified"} />
                <StatCard label="Experience" value={kpis.minimum_experience_years ? `${kpis.minimum_experience_years} years` : "Not specified"} />
                <StatCard label="Certifications" value={kpis.certifications_required || "Not specified"} />
              </div>
            )}
            <p className="mt-4 text-xs font-semibold text-slate-400">
              Hover over a bar in the chart to switch category
            </p>
          </Panel>
        </div>
      ) : null}

      {/* ── RISK INSIGHTS TAB ── */}
      {active === "clauses" ? (
        <div className="space-y-6">
          <Panel icon={<ShieldAlert size={20} />} title="Clause-level risk marking">
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <CitationList citations={citations} />
              <div className="space-y-5">
                <InsightList title="Risk reasons" items={riskReasons} empty="No risk reasons were generated." />
                <InsightList title="Missing clauses" items={missingClauses} empty="No missing clauses detected." danger />
              </div>
            </div>
          </Panel>

          <Panel icon={<Zap size={20} />} title="Ambiguity Detection">
            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-500 uppercase tracking-[0.14em]">Ambiguity Risk Level</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${ambiguityRiskLevelTone(ambiguityRiskLevel)}`}>
                  {ambiguityRiskLevel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-500 uppercase tracking-[0.14em]">Total Flagged</span>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
                  {totalAmbiguities}
                </span>
              </div>
            </div>

            {ambiguityFindings.length > 0 ? (
              <div className="space-y-4">
                {ambiguityFindings.map((finding, index) => (
                  <div key={`${finding.clause}-${index}`} className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-[var(--ink-blue)]">{finding.clause}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${ambiguityTypeTone(finding.type)}`}>
                            {finding.type.replace(/_/g, " ")}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${impactTone(finding.risk_impact)}`}>
                            {finding.risk_impact} IMPACT
                          </span>
                        </div>
                      </div>
                    </div>
                    {finding.ambiguous_phrase && (
                      <div className="mt-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Ambiguous Phrase</p>
                        <blockquote className="mt-2 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-800">
                          "{finding.ambiguous_phrase}"
                        </blockquote>
                      </div>
                    )}
                    {finding.interpretations && finding.interpretations.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Possible Interpretations</p>
                        <div className="mt-2 space-y-2">
                          {finding.interpretations.map((interp, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-600">{i + 1}</span>
                              <p className="text-sm leading-6 text-slate-600 font-medium">{interp}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {finding.suggested_fix && (
                      <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">Suggested Fix</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">{finding.suggested_fix}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                No ambiguous language detected in this contract.
              </p>
            )}
          </Panel>
        </div>
      ) : null}

      {/* ── DOCUMENT KPIs TAB ── */}
      {active === "document" ? (
        <Panel icon={<FileSearch size={20} />} title="Extracted Contract Details">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Info label="Scope" value={kpis.scope_summary || "Not specified"} />
            <Info label="Payment terms" value={kpis.payment_terms || "Not specified"} />
            <Info label="Payment cycle" value={`${kpis.payment_cycle_days || 0} days`} />
            <Info label="Delivery timeline" value={`${kpis.delivery_timeline_days || 0} days`} />
            <Info label="SLA response" value={`${kpis.sla_response_time_hours || 0} hours`} />
            <Info label="Uptime SLA" value={`${kpis.sla_uptime_percent || 0}%`} />
            <Info label="Maintenance" value={kpis.maintenance_frequency || "Not specified"} />
            <Info label="Warranty" value={`${kpis.warranty_months || 0} months`} />
            <Info label="Vendor turnover" value={kpis.minimum_turnover_required || "Not specified"} />
            <Info label="Experience" value={`${kpis.minimum_experience_years || 0} years`} />
            <Info label="Certifications" value={kpis.certifications_required || "Not specified"} />
          </div>
        </Panel>
      ) : null}

      {/* ── FIX RECOMMENDATIONS TAB ── */}
      {active === "recommendations" ? (
        <RecommendationsPanel
          recommendations={recommendations}
          meta={recoMeta}
          loading={recoLoading}
          error={recoError}
          onGenerate={() => fetchRecommendations(false)}
          onRegenerate={() => fetchRecommendations(true)}
        />
      ) : null}
    </main>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-[var(--carrier-blue)]">{icon}</span>
        <h2 className="text-xl font-black text-[var(--ink-blue)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function inferCategory(insight: string): { label: string; color: string } {
  const text = insight.toLowerCase();
  if (text.includes("payment") || text.includes("value") || text.includes("deposit") || text.includes("retention") || text.includes("emd") || text.includes("advance"))
    return { label: "Commercial", color: "bg-blue-100 text-blue-700" };
  if (text.includes("sla") || text.includes("uptime") || text.includes("maintenance") || text.includes("delivery") || text.includes("response") || text.includes("timeline"))
    return { label: "Operational", color: "bg-purple-100 text-purple-700" };
  if (text.includes("penalty") || text.includes("liquidated") || text.includes("legal") || text.includes("warranty") || text.includes("termination") || text.includes("clause"))
    return { label: "Legal", color: "bg-red-100 text-red-700" };
  if (text.includes("vendor") || text.includes("turnover") || text.includes("certification") || text.includes("experience") || text.includes("criteria"))
    return { label: "Vendor", color: "bg-amber-100 text-amber-700" };
  return { label: "General", color: "bg-slate-100 text-slate-700" };
}

function CitationList({ citations }: { citations: ClauseCitation[] }) {
  if (!citations.length) {
    return (
      <p className="rounded-lg border border-dashed border-blue-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
        No citation map is available for this contract.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-black uppercase tracking-[0.14em] text-slate-500">Cited evidence</h3>
        <p className="mt-2 text-base leading-7 text-slate-600">
          Each insight is mapped to the closest parsed contract wording.
        </p>
      </div>
      {citations.map((citation, index) => (
        <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm" key={`${citation.insight}-${index}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-black text-[var(--ink-blue)]">{citation.insight}</p>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-[var(--carrier-blue)]">
              {citation.page ? `Page ${citation.page}, lines ${citation.line_start}-${citation.line_end}` : "Absence check"}
            </span>
          </div>
          <blockquote className="mt-3 border-l-4 border-[var(--carrier-blue)] bg-blue-50 px-4 py-3 text-base font-semibold leading-7 text-slate-800">
            {citation.snippet}
          </blockquote>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${inferCategory(citation.insight).color}`}>
              {inferCategory(citation.insight).label}
            </span>
            {(citation.matched_terms || []).slice(0, 5).map((term) => (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600" key={term}>{term}</span>
            ))}
            {citation.confidence ? (
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-white">{formatLabel(citation.confidence)}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightList({ title, items, empty, danger }: { title: string; items: string[]; empty: string; danger?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div className={`rounded-lg border p-4 ${danger ? "border-red-200 bg-red-50" : "border-blue-100 bg-blue-50"}`} key={`${item}-${index}`}>
              <p className={`text-base font-bold ${danger ? "text-red-700" : "text-[var(--ink-blue)]"}`}>{item}</p>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-blue-200 p-5 text-sm font-semibold text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function ActionButton({ label, icon, onClick, disabled, tone }: {
  label: string; icon: React.ReactNode; onClick: () => void; disabled: boolean;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  const tones = {
    primary: "bg-[var(--carrier-blue)] hover:bg-[var(--ink-blue)]",
    success: "bg-emerald-600 hover:bg-emerald-700",
    warning: "bg-amber-600 hover:bg-amber-700",
    danger: "bg-red-600 hover:bg-red-700",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Recommendations Panel ────────────────────────────────────────────────────

function RecommendationsPanel({
  recommendations,
  meta,
  loading,
  error,
  onGenerate,
  onRegenerate,
}: {
  recommendations: Recommendation[];
  meta: { priority: string; total: number; cached: boolean } | null;
  loading: boolean;
  error: string;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  if (!meta && !loading && !error) {
    return (
      <Panel icon={<Wrench size={20} />} title="Fix Recommendations">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-[var(--carrier-blue)]">
            <Wrench size={32} />
          </div>
          <h3 className="mt-5 text-xl font-black text-[var(--ink-blue)]">
            AI-Powered Fix Recommendations
          </h3>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
            Generate actionable fixes for every flagged risk, missing clause, and ambiguous phrase —
            with suggested rewrite language and negotiation notes ready to use with your vendor.
          </p>
          <button
            onClick={onGenerate}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--carrier-blue)] px-6 py-3 font-black text-white shadow-sm transition hover:bg-[var(--ink-blue)]"
            type="button"
          >
            <Wrench size={17} />
            Generate Recommendations
          </button>
        </div>
      </Panel>
    );
  }

  if (loading) {
    return (
      <Panel icon={<Wrench size={20} />} title="Fix Recommendations">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[var(--carrier-blue)]" />
          <p className="mt-5 text-sm font-black text-[var(--ink-blue)]">Generating fix recommendations...</p>
          <p className="mt-2 text-xs text-slate-500">AI is analyzing each flagged clause and drafting fix language</p>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel icon={<Wrench size={20} />} title="Fix Recommendations">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-black text-red-700">{error}</p>
          <button onClick={onGenerate} className="mt-4 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700" type="button">
            Try Again
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel icon={<Wrench size={20} />} title="Fix Recommendations">
      {/* Summary bar */}
      <div className={`mb-6 flex flex-wrap items-center gap-4 rounded-lg border p-4 ${priorityBannerStyle(meta?.priority || "NONE")}`}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-[0.14em] opacity-70">Remediation Priority</span>
          <span className="rounded-full border px-3 py-1 text-xs font-black border-current">{meta?.priority || "NONE"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] opacity-70">Fixes Generated</span>
          <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-black">{meta?.total || 0}</span>
        </div>
        {meta?.cached && (
          <span className="text-xs font-semibold opacity-60">Cached result</span>
        )}
        <button
          onClick={onRegenerate}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-current/30 bg-white/40 px-3 py-1.5 text-xs font-black transition hover:bg-white/60"
          type="button"
        >
          <RotateCcw size={12} />
          Regenerate
        </button>
      </div>

      {/* Cards */}
      {recommendations.length > 0 ? (
        <div className="space-y-5">
          {recommendations.map((rec, index) => (
            <div key={`${rec.original_clause}-${index}`} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              {/* Card header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--ink-blue)] text-xs font-black text-white">
                    {rec.priority_order}
                  </span>
                  <p className="text-base font-black text-[var(--ink-blue)]">{rec.original_clause}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${severityStyle(rec.severity)}`}>
                    {rec.severity} SEVERITY
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${issueTypeStyle(rec.issue_type)}`}>
                    {rec.issue_type.replace(/_/g, " ")}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${remediationTypeStyle(rec.remediation_type)}`}>
                    {rec.remediation_type.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4">
                {/* Disadvantaged party + problem */}
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Disadvantaged Party</p>
                    <p className="mt-1 text-sm font-black text-[var(--ink-blue)]">{rec.disadvantaged_party}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">What Is Wrong</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{rec.what_is_wrong}</p>
                  </div>
                </div>

                {/* Suggested fix */}
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">Suggested Fix</p>
                  <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="whitespace-pre-line text-sm font-semibold leading-7 text-emerald-900">
                      {rec.suggested_fix}
                    </p>
                  </div>
                </div>

                {/* Negotiation note */}
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--carrier-blue)]">Negotiation Note</p>
                  <div className="mt-2 flex gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                    <MessageSquare className="mt-0.5 shrink-0 text-[var(--carrier-blue)]" size={16} />
                    <p className="text-sm font-semibold leading-6 text-blue-900">{rec.negotiation_note}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
          No recommendations generated. This may indicate the contract is well-structured.
        </p>
      )}
    </Panel>
  );
}