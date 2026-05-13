"use client";

import { Badge, StatCard } from "@/components/DashboardPrimitives";
import api from "@/lib/api";
import { formatLabel, riskTone, workflowTone } from "@/lib/risk";
import type { ClauseCitation, Contract, RiskBreakdown } from "@/lib/types";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  Gauge,
  MailCheck,
  RotateCcw,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Tab = "overview" | "clauses" | "document" | "workflow";
type VendorMail = {
  recipient: string;
  subject: string;
  body: string;
  delivery_status: string;
  sent?: boolean;
  delivery_reason?: string;
};

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "clauses", label: "Risk Insights" },
  { id: "document", label: "Document KPIs" },
  { id: "workflow", label: "Workflow" },
];

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
  const [mail, setMail] = useState<VendorMail | null>(null);
  const [error, setError] = useState("");

  const fetchContract = useCallback(async () => {
    const response = await api.get<Contract>(`/dashboard/contracts/${contractId}`);
    setContract(response.data);
  }, [contractId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContract().catch((fetchError: unknown) => {
      console.error(fetchError);
      setError("Unable to load contract intelligence.");
    });
  }, [fetchContract]);

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

  const composeMail = async (decision: "APPROVE" | "NEGOTIATE" | "REJECT", send = false) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.post<VendorMail>(`/contracts/${contractId}/vendor-mail`, {
        decision,
        recipient_email: "vendor@example.com",
        notes: contract?.manager_notes || contract?.analyst_notes,
        send,
      });
      setMail(response.data);
      setActive("workflow");
    } catch (mailError: unknown) {
      const axiosError = mailError as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || "Mail draft failed.");
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

      <section className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
        <div className="grid gap-8 xl:grid-cols-[1fr_330px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--carrier-blue)]">Contract RL-{contract.id}</p>
            <h1 className="mt-2 text-4xl font-black text-[var(--ink-blue)]">
  {contract.filename.replace(/_/g, " ").replace(".pdf", "")}
</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {contract.executive_summary || "AI executive summary will appear after analysis."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge value="AI Analyzed" />
              <Badge value={contract.vendor_name || "Vendor unspecified"} />
              <Badge value={contract.document_type || "Other"} />
              <Badge tone={riskTone(contract.risk_band)} value={contract.risk_band} />
              <Badge tone={workflowTone(contract.workflow_status)} value={contract.workflow_status} />
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Overall risk score</p>
            <p className="mt-3 text-6xl font-black text-[var(--ink-blue)]">{contract.overall_risk_score || 0}</p>
<p className="mt-2 text-sm font-bold text-slate-600">Recommendation: {formatLabel(contract.recommendation)}</p>
<div className="mt-3">
  <Badge tone={riskTone(contract.risk_band)} value={contract.risk_band} />
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
        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-blue-100">
        {tabs.map((tab) => (
          <button
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-black transition ${
              active === tab.id ? "border-[var(--carrier-blue)] text-[var(--ink-blue)]" : "border-transparent text-slate-500"
            }`}
            key={tab.id}
            onClick={() => setActive(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "overview" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <Panel icon={<Gauge size={20} />} title="Risk breakdown">
            <div className="h-80 min-h-80 min-w-0">
              <ResponsiveContainer height="100%" minHeight={320} minWidth={240} width="100%">
                <BarChart data={riskData}>
                  <CartesianGrid stroke="#dbeafe" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} />
                  <YAxis domain={[0, 100]} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#005da8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel icon={<FileSearch size={20} />} title="Commercial KPIs">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Contract Value" value={contract.contract_value ? `${contract.currency || "INR"} ${contract.contract_value}` : "Not specified"} />
<StatCard label="Duration" value={contract.contract_duration_months ? `${contract.contract_duration_months} months` : "Not specified"} />
<StatCard label="Security Deposit" value={contract.security_deposit_percent ? `${contract.security_deposit_percent}%` : "Not specified"} />
<StatCard label="Retention" value={contract.retention_percent ? `${contract.retention_percent}%` : "Not specified"} />
            </div>
          </Panel>
        </div>
      ) : null}

      {active === "clauses" ? (
        <Panel icon={<ShieldAlert size={20} />} title="Clause-level risk marking">
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <CitationList citations={citations} />
            <div className="space-y-5">
              <InsightList title="Risk reasons" items={riskReasons} empty="No risk reasons were generated." />
              <InsightList title="Missing clauses" items={missingClauses} empty="No missing clauses detected." danger />
            </div>
          </div>
        </Panel>
      ) : null}

      {active === "document" ? (
        <Panel icon={<FileSearch size={20} />} title="Extracted HVAC procurement details">
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

      {active === "workflow" ? (
        <Panel icon={<MailCheck size={20} />} title="Decision and vendor communication">
          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
              <p className="font-black text-[var(--ink-blue)]">Decision controls</p>
              <div className="mt-4 grid gap-3">
                <ActionButton disabled={loading} icon={<MailCheck size={17} />} label="Draft approval" onClick={() => composeMail("APPROVE")} tone="success" />
                <ActionButton disabled={loading} icon={<RotateCcw size={17} />} label="Draft negotiation" onClick={() => composeMail("NEGOTIATE")} tone="warning" />
                <ActionButton disabled={loading} icon={<XCircle size={17} />} label="Draft rejection" onClick={() => composeMail("REJECT")} tone="danger" />
                <ActionButton disabled={loading} icon={<MailCheck size={17} />} label="Send approval email" onClick={() => composeMail("APPROVE", true)} tone="primary" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                SMTP is supported through backend env values. Without SMTP credentials, RiskLens safely returns a draft.
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-white p-5">
              {mail ? (
                <>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Draft ready</p>
                  <h3 className="mt-2 text-xl font-black text-[var(--ink-blue)]">{mail.subject}</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-600">To: {mail.recipient}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Delivery: {formatLabel(mail.delivery_status)}. {mail.delivery_reason}
                  </p>
                  <pre className="mt-5 whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-sm leading-6 text-white">{mail.body}</pre>
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-blue-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                  Compose an approval, negotiation, or rejection draft after manager decision.
                </p>
              )}
            </div>
          </div>
        </Panel>
      ) : null}
    </main>
  );
}

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
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Cited evidence</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Each insight is mapped to the closest parsed contract wording. New uploads include stronger page and line
          references because the source PDF is stored during upload.
        </p>
      </div>
      {citations.map((citation, index) => (
        <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm" key={`${citation.insight}-${index}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-black text-[var(--ink-blue)]">{citation.insight}</p>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-[var(--carrier-blue)]">
              {citation.page ? `Page ${citation.page}, lines ${citation.line_start}-${citation.line_end}` : "Absence check"}
            </span>
          </div>
          <blockquote className="mt-3 border-l-4 border-[var(--carrier-blue)] bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-800">
            {citation.snippet}
          </blockquote>
          <div className="mt-3 flex flex-wrap gap-2">
            {(citation.matched_terms || []).slice(0, 5).map((term) => (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600" key={term}>
                {term}
              </span>
            ))}
            {citation.confidence ? (
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-white">
                {formatLabel(citation.confidence)}
              </span>
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
              <p className={`text-sm font-bold ${danger ? "text-red-700" : "text-[var(--ink-blue)]"}`}>{item}</p>
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

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
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
