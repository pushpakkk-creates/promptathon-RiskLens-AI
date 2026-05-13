"use client";

import AppShell from "@/components/AppShell";
import { ContractTable, FilterSelect, StatCard } from "@/components/DashboardPrimitives";
import api from "@/lib/api";
import { averageRisk, countByRisk, documentTypes, riskBands, workflowStatuses } from "@/lib/risk";
import type { AnalystDashboardData, Contract } from "@/lib/types";
import { AxiosError } from "axios";
import { AlertTriangle, ClipboardList, Database, FileUp, Gauge, ShieldCheck, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Filters = {
  risk_band: string;
  document_type: string;
  workflow_status: string;
};

const defaultFilters: Filters = {
  risk_band: "ALL",
  document_type: "ALL",
  workflow_status: "ALL",
};

export default function AnalystDashboard() {
  const router = useRouter();
  const [active, setActive] = useState("overview");
  const [data, setData] = useState<AnalystDashboardData | null>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [email] = useState(() =>
    typeof window === "undefined" ? "analyst@risklens.ai" : localStorage.getItem("email") || "analyst@risklens.ai",
  );

  useEffect(() => {
    localStorage.setItem("role", "analyst");
  }, []);

  const fetchDashboard = useCallback(async () => {
    const response = await api.get<AnalystDashboardData>(`/dashboard/analyst/${email}`, {
      params: filters,
    });
    setData(response.data);
  }, [email, filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard().catch((error: unknown) => console.error(error));
  }, [fetchDashboard]);

  const contracts = data?.contracts || [];
  const riskCounts = countByRisk(contracts);
  const avgRisk = averageRisk(contracts);

  const chartData = useMemo(
    () => [
      { name: "Low", count: riskCounts.low },
      { name: "Moderate", count: riskCounts.moderate },
      { name: "High", count: riskCounts.high },
      { name: "Critical", count: riskCounts.critical },
    ],
    [riskCounts.critical, riskCounts.high, riskCounts.low, riskCounts.moderate],
  );

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const uploadContract = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setUploadError("");

      const response = await api.post<{ contract_id: number }>("/contracts/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      router.push(`/contracts/${response.data.contract_id}`);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      setUploadError(axiosError.response?.data?.detail || "Upload failed. Please try a PDF contract document.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  if (!data) {
    return <LoadingState label="Loading analyst workspace" />;
  }

  return (
    <AppShell active={active} onChange={setActive} role="analyst">
     <Header
  eyebrow="AI Contract Intelligence"
  title="Contract Risk Analysis"
  description="Upload and analyze contracts instantly — extract risk insights, clause analysis, and vendor intelligence."
  onUpload={() => setActive("upload")}
/>
      {active === "overview" ? (
        <div className="space-y-6">
         
<section className="rounded-xl border border-blue-100 bg-gradient-to-r from-[var(--ink-blue)] to-[#003087] p-6 text-white shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">Live contract portfolio</p>
<h2 className="mt-2 text-3xl font-black">Contract Risk Command Center</h2>
<p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50">
  AI-powered contract intelligence giving you instant risk scores, clause analysis, and vendor insights across your entire contract portfolio.
</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* <HeroMetric label="Contracts source" value="Live Database" icon={<Database size={18} />} /> */}
                
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
           <StatCard label="Total Contracts" value={data.portfolio_total || contracts.length} detail="All contracts in the system" />
<StatCard label="My Contracts" value={data.total_uploaded} detail="Uploaded by you" />
<StatCard label="Awaiting Manager" value={data.pending_review} detail="Submitted for review" />
<StatCard label="Avg Risk Score" value={avgRisk} detail="Across current filtered view" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel title="Risk distribution" icon={<Gauge size={20} />}>
              <div className="h-72 min-h-72 min-w-0">
                <ResponsiveContainer height="100%" minHeight={288} minWidth={240} width="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="#dbeafe" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#005da8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Workflow controls" icon={<ShieldCheck size={20} />}>
              <Filters filters={filters} onChange={updateFilter} />
            </Panel>
          </div>

          <ContractTable contracts={contracts.slice(0, 6)} emptyText="No contracts match this view yet." onOpen={(id) => router.push(`/contracts/${id}`)} />

          <div className="grid gap-6 xl:grid-cols-3">
            <SignalCard title="High-risk attention" value={riskCounts.high + riskCounts.critical} detail="Contracts requiring clause negotiation or manager review" />
            <SignalCard title="Approved outcomes" value={data.approved} detail="Closed approvals in the connected database" />
            <SignalCard title="Escalation lane" value={data.escalated} detail="Currently escalated workflow records" />
          </div>
        </div>
      ) : null}

      {active === "contracts" ? (
        <div className="space-y-6">
          <Panel title="Contract filters" icon={<ClipboardList size={20} />}>
            <Filters filters={filters} onChange={updateFilter} />
          </Panel>
          <ContractTable contracts={contracts} emptyText="No contracts found for the selected filters." onOpen={(id) => router.push(`/contracts/${id}`)} />
        </div>
      ) : null}

      {active === "insights" ? <RiskInsights contracts={contracts} /> : null}

      {active === "upload" ? (
        <Panel title="Upload contract" icon={<FileUp size={20} />}>
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-8 text-center transition hover:bg-blue-100">
              <FileUp className="text-[var(--carrier-blue)]" size={40} />
              <span className="mt-4 text-xl font-black text-[var(--ink-blue)]">
                {uploading ? "Analyzing contract..." : "Drop or choose a PDF contract"}
              </span>
              <span className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
  Upload your contract and get instant AI-powered risk analysis, clause insights, and vendor intelligence.
</span>
              <input accept=".pdf" className="hidden" disabled={uploading} onChange={uploadContract} type="file" />
            </label>

            <div className="rounded-lg border border-blue-100 bg-white p-5">
              <p className="font-black text-[var(--ink-blue)]">Accepted Contract Document Types</p>
              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                {["Tender or RFP", "AMC or maintenance SLA", "Payment, warranty, EMD", "Vendor turnover and certification"].map((item) => (
                  <div className="flex items-center gap-2" key={item}>
                    <ShieldCheck className="text-emerald-600" size={17} />
                    {item}
                  </div>
                ))}
              </div>
              {uploadError ? (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {uploadError}
                </div>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}

function Filters({ filters, onChange }: { filters: Filters; onChange: (key: keyof Filters, value: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <FilterSelect label="Risk band" onChange={(value) => onChange("risk_band", value)} options={riskBands} value={filters.risk_band} />
      <FilterSelect label="Contract type" onChange={(value) => onChange("document_type", value)} options={documentTypes} value={filters.document_type} />
      <FilterSelect label="Workflow" onChange={(value) => onChange("workflow_status", value)} options={workflowStatuses} value={filters.workflow_status} />
    </div>
  );
}

function RiskInsights({ contracts }: { contracts: Contract[] }) {
  const insights = contracts.flatMap((contract) =>
    (contract.risk_reasons || []).map((reason) => ({
      contract,
      reason,
    })),
  );

  return (
    <Panel title="Clause-level risk insights" icon={<AlertTriangle size={20} />}>
      <div className="grid gap-4">
        {insights.length ? (
          insights.slice(0, 12).map((insight, index) => (
            <div className="rounded-lg border border-blue-100 bg-white p-4" key={`${insight.contract.id}-${index}`}>
              <p className="text-sm font-black text-[var(--ink-blue)]">{insight.reason}</p>
              <p className="mt-2 text-sm text-slate-600">
                Marked against {insight.contract.filename} for vendor {insight.contract.vendor_name || "Unknown"}.
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-blue-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            No clause risks in the current filtered view.
          </p>
        )}
      </div>
    </Panel>
  );
}

function Header({ eyebrow, title, description, onUpload }: { eyebrow: string; title: string; description: string; onUpload: () => void }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-blue-100 pb-6 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--carrier-blue)]">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black text-[var(--ink-blue)]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--carrier-blue)] px-9 py-5 font-black text-white shadow-sm transition hover:bg-[var(--ink-blue)] whitespace-nowrap"
        type="button"
      >
        <FileUp size={18} />
        Upload Contract
      </button>
    </div>
  );
}


function HeroMetric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-blue-100">
        {icon}
        <p className="text-xs font-black uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-black capitalize">{value}</p>
    </div>
  );
}

function SignalCard({ title, value, detail }: { title: string; value: number; detail: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-[var(--ink-blue)]">{title}</p>
      <p className="mt-3 text-4xl font-black text-[var(--carrier-blue)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-[var(--carrier-blue)]">{icon}</span>
        <h2 className="text-xl font-black text-[var(--ink-blue)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div className="grid min-h-screen place-items-center bg-[var(--background)] text-sm font-black text-[var(--ink-blue)]">{label}</div>;
}
