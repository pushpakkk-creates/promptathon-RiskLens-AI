"use client";

import AppShell from "@/components/AppShell";
import { ContractTable, FilterSelect, StatCard } from "@/components/DashboardPrimitives";
import api from "@/lib/api";
import { averageRisk, countByRisk, documentTypes, riskBands, workflowStatuses } from "@/lib/risk";
import type { ManagerDashboardData } from "@/lib/types";
import { BarChart3, CheckCircle2, Database, MailCheck, ShieldAlert, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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

const riskColors = ["#138a4d", "#d99a00", "#e56b1f", "#c82032"];

export default function ManagerDashboard() {
  const router = useRouter();
  const [active, setActive] = useState("overview");
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    localStorage.setItem("role", "manager");
    localStorage.setItem("email", localStorage.getItem("email") || "manager@risklens.ai");
  }, []);

  const fetchQueue = useCallback(async () => {
    const response = await api.get<ManagerDashboardData>("/dashboard/manager", {
      params: filters,
    });
    setData(response.data);
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueue().catch((error: unknown) => console.error(error));
  }, [fetchQueue]);

  const queue = data?.approval_queue || [];
  const allContracts = data?.all_contracts || [];
  const riskCounts = countByRisk(allContracts);
  const avgRisk = averageRisk(allContracts);

  const pieData = useMemo(
    () => [
      { name: "Low", value: riskCounts.low },
      { name: "Moderate", value: riskCounts.moderate },
      { name: "High", value: riskCounts.high },
      { name: "Critical", value: riskCounts.critical },
    ],
    [riskCounts.critical, riskCounts.high, riskCounts.low, riskCounts.moderate],
  );

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  if (!data) {
    return <div className="grid min-h-screen place-items-center bg-[var(--background)] text-sm font-black text-[var(--ink-blue)]">Loading manager dashboard</div>;
  }

  return (
    <AppShell active={active} onChange={setActive} role="manager">
      <Header
  eyebrow="Manager Command Center"
  title="Contract Approval Governance"
  description="Review AI-analyzed contracts, inspect risk scores and clause insights, and record vendor decisions."
/>
      {active === "overview" ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-blue-100 bg-gradient-to-r from-[var(--ink-blue)] to-[#003087] p-6 text-white shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">Live contract governance</p>
<h2 className="mt-2 text-3xl font-black">Manager Approval Command Center</h2>
<p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50">
  Review AI-analyzed contracts, inspect risk rationale, and record approval, rejection, or negotiation decisions from one controlled view.
</p>
              </div>
             
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Pending approvals" value={data.pending_count} detail="Awaiting manager decision" />
            <StatCard label="Reviewed" value={data.total_reviewed} detail="Closed governance actions" />
            <StatCard label="Approved" value={data.approved} detail="Final approval recorded" />
            <StatCard label="Average risk" value={avgRisk} detail="All visible contracts" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel title="Risk portfolio" icon={<BarChart3 size={20} />}>
              <div className="h-72 min-h-72 min-w-0">
                <ResponsiveContainer height="100%" minHeight={288} minWidth={240} width="100%">
                  <PieChart>
  <Pie
    data={pieData}
    dataKey="value"
    innerRadius={60}
    outerRadius={100}
    paddingAngle={4}
    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
    labelLine={true}
  >
    {pieData.map((entry, index) => (
      <Cell fill={riskColors[index % riskColors.length]} key={entry.name} />
    ))}
  </Pie>
  <Tooltip formatter={(value, name) => [value, name]} />
</PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Governance filters" icon={<ShieldAlert size={20} />}>
              <Filters filters={filters} onChange={updateFilter} />
            </Panel>
          </div>

          <ContractTable contracts={queue.slice(0, 6)} emptyText="No contracts are waiting in the manager queue." onOpen={(id) => router.push(`/contracts/${id}`)} />
        </div>
      ) : null}

      
{active === "queue" ? (
  <div className="space-y-6">
    <Panel title="Approval queue filters" icon={<CheckCircle2 size={20} />}>
      <Filters filters={filters} onChange={updateFilter} />
    </Panel>
    <ContractTable
      contracts={allContracts}
      emptyText="No contracts found."
      onOpen={(id) => router.push(`/contracts/${id}`)}
    />
  </div>
) : null}

      {active === "analytics" ? (
        <Panel title="Risk analytics" icon={<BarChart3 size={20} />}>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Low" value={riskCounts.low} />
            <StatCard label="Moderate" value={riskCounts.moderate} />
            <StatCard label="High" value={riskCounts.high} />
            <StatCard label="Critical" value={riskCounts.critical} />
          </div>
        </Panel>
      ) : null}

      {active === "vendors" ? (
        <Panel title="Vendor communication queue" icon={<MailCheck size={20} />}>
          <div className="grid gap-4">
            {allContracts.filter((contract) => ["APPROVED", "REJECTED", "SENT_BACK"].includes(contract.workflow_status)).length ? (
              allContracts
                .filter((contract) => ["APPROVED", "REJECTED", "SENT_BACK"].includes(contract.workflow_status))
                .slice(0, 10)
                .map((contract) => (
                  <div className="rounded-lg border border-blue-100 bg-white p-4" key={contract.id}>
                    <p className="font-black text-[var(--ink-blue)]">{contract.vendor_name || "Unknown vendor"}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {contract.filename} is ready for approval, rejection, or negotiation mail draft from the contract page.
                    </p>
                  </div>
                ))
            ) : (
              <p className="rounded-lg border border-dashed border-blue-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                Decisions will appear here after manager action.
              </p>
            )}
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

function Header({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-blue-100 pb-6 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--carrier-blue)]">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black text-[var(--ink-blue)]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
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
