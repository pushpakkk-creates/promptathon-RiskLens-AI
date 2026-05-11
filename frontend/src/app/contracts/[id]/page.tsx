"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

type ContractDetail = {
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
  risk_band: string;
  recommendation: string;
  status: string;

  procurement_kpis: any;
  risk_breakdown: any;
  missing_clauses: string[];
  risk_reasons: string[];

  executive_summary: string;
};

export default function ContractPage() {
  const params = useParams();
  const contractId = params.id;

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchContract();
  }, []);

  const fetchContract = async () => {
    try {
      const response = await api.get(`/dashboard/contracts/${contractId}`);
      setContract(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      setUpdating(true);

      await api.patch(`/dashboard/contracts/${contractId}/status`, {
        status,
      });

      fetchContract();
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  if (!contract) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-xl">
        Loading RiskLens AI...
      </div>
    );
  }

  const kpis = contract.procurement_kpis || {};
  const risk = contract.risk_breakdown || {};

  const getRiskColor = (band: string) => {
    if (band.includes("CRITICAL")) return "text-red-400";
    if (band.includes("HIGH")) return "text-orange-400";
    if (band.includes("MODERATE")) return "text-yellow-400";
    return "text-green-400";
  };

  const getStatusColor = (status: string) => {
    if (status === "APPROVED") return "bg-green-950 text-green-400";
    if (status === "REJECTED") return "bg-red-950 text-red-400";
    if (status === "ESCALATED") return "bg-orange-950 text-orange-400";
    return "bg-yellow-900 text-yellow-400";
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      {/* HERO */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:justify-between gap-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">
              RiskLens AI
            </h1>

            <p className="text-gray-400 mt-4 text-lg break-words">
              {contract.filename}
            </p>

            <div className="flex flex-wrap gap-3 mt-5">
  <Badge value={contract.document_type} />

  <span className="px-5 py-2 rounded-full bg-blue-950 text-blue-300 font-bold text-sm border border-blue-800">
    {contract.vendor_name || "Vendor Unspecified"}
  </span>

  <Badge
    value={contract.status}
    customClass={getStatusColor(contract.status)}
  />
</div>
          </div>

          <div className="lg:text-right">
            <h2 className={`text-3xl font-bold ${getRiskColor(contract.risk_band)}`}>
              {contract.risk_band}
            </h2>

            <p className="text-gray-400 mt-3">
              Risk Score
            </p>

            <p className="text-5xl font-bold mt-1">
              {contract.overall_risk_score}
            </p>

            <p className="mt-4 text-lg">
              Recommendation:
              <span className="text-blue-400 font-bold ml-2">
                {contract.recommendation}
              </span>
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="mt-8 flex flex-wrap gap-4">
          <ActionButton
            label="Approve"
            color="bg-green-600 hover:bg-green-700"
            onClick={() => updateStatus("APPROVED")}
            disabled={updating}
          />

          <ActionButton
            label="Review"
            color="bg-yellow-600 hover:bg-yellow-700"
            onClick={() => updateStatus("REVIEW")}
            disabled={updating}
          />

          <ActionButton
            label="Escalate"
            color="bg-orange-600 hover:bg-orange-700"
            onClick={() => updateStatus("ESCALATED")}
            disabled={updating}
          />

          <ActionButton
            label="Reject"
            color="bg-red-600 hover:bg-red-700"
            onClick={() => updateStatus("REJECTED")}
            disabled={updating}
          />
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard title="Contract Value" value={`${contract.currency} ${contract.contract_value || "N/A"}`} />
        <MetricCard title="Duration" value={`${contract.contract_duration_months || 0} months`} />
        <MetricCard title="EMD" value={contract.emd_amount || "N/A"} />
        <MetricCard title="Security Deposit" value={`${contract.security_deposit_percent || 0}%`} />
        <MetricCard title="Retention" value={`${contract.retention_percent || 0}%`} />
        <MetricCard title="Payment Cycle" value={`${kpis.payment_cycle_days || 0} days`} />
        <MetricCard title="Advance Payment" value={kpis.advance_payment ? "Yes" : "No"} />
        <MetricCard title="Warranty" value={`${kpis.warranty_months || 0} months`} />
      </div>

      {/* RISK BREAKDOWN */}
      <Section title="Risk Breakdown">
        <RiskBar title="Commercial" value={risk.commercial || 0} />
        <RiskBar title="Operational" value={risk.operational || 0} />
        <RiskBar title="Legal" value={risk.legal || 0} />
        <RiskBar title="Vendor" value={risk.vendor || 0} />
      </Section>

      {/* EXEC SUMMARY */}
      <Section title="AI Executive Assessment">
        <p className="text-gray-300 leading-8 whitespace-pre-line">
          {contract.executive_summary}
        </p>
      </Section>

      {/* PROCUREMENT DETAILS */}
      <Section title="Procurement Intelligence">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoItem title="Payment Terms" value={kpis.payment_terms || "Not specified"} />
          <InfoItem title="Delivery Timeline" value={`${kpis.delivery_timeline_days || 0} days`} />
          <InfoItem title="SLA Response Time" value={`${kpis.sla_response_time_hours || 0} hours`} />
          <InfoItem title="Uptime Commitment" value={`${kpis.sla_uptime_percent || 0}%`} />
          <InfoItem title="Maintenance Frequency" value={kpis.maintenance_frequency || "Not specified"} />
          <InfoItem title="Minimum Turnover" value={kpis.minimum_turnover_required || "Not specified"} />
          <InfoItem title="Experience Required" value={`${kpis.minimum_experience_years || 0} years`} />
          <InfoItem title="Certifications" value={kpis.certifications_required || "Not specified"} />
        </div>

        <div className="mt-6">
          <InfoItem
            title="Scope Summary"
            value={kpis.scope_summary || "No scope summary available"}
          />
        </div>
      </Section>

      {/* MISSING CLAUSES */}
      <Section title="Missing Clauses">
        <div className="flex flex-wrap gap-3">
          {contract.missing_clauses.map((clause, index) => (
            <span
              key={index}
              className="bg-red-950 text-red-300 px-4 py-2 rounded-full text-sm"
            >
              {clause}
            </span>
          ))}
        </div>
      </Section>

      {/* RISK INSIGHTS */}
      <Section title="Risk Insights">
        <div className="space-y-4">
          {contract.risk_reasons.map((reason, index) => (
            <div
              key={index}
              className="bg-zinc-800 rounded-2xl p-4 border border-zinc-700"
            >
              ⚠ {reason}
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8">
      <h2 className="text-2xl font-bold mb-6">
        {title}
      </h2>
      {children}
    </div>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
      <h3 className="text-gray-400 text-sm uppercase">
        {title}
      </h3>

      <p className="text-2xl font-bold mt-3 break-words">
        {value}
      </p>
    </div>
  );
}

function RiskBar({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span>{title}</span>
        <span className="font-bold">{value}</span>
      </div>

      <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
        <div
          className="bg-blue-500 h-4 rounded-full transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function InfoItem({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-gray-400 text-sm uppercase mb-2">
        {title}
      </p>

      <p className="text-lg break-words">
        {value}
      </p>
    </div>
  );
}

function Badge({
  value,
  customClass,
}: {
  value: string;
  customClass?: string;
}) {
  return (
    <span
      className={`px-4 py-2 rounded-full text-sm ${
        customClass || "bg-zinc-800 text-gray-300"
      }`}
    >
      {value}
    </span>
  );
}

function ActionButton({
  label,
  color,
  onClick,
  disabled,
}: {
  label: string;
  color: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${color} px-6 py-3 rounded-2xl font-semibold transition disabled:opacity-50`}
    >
      {label}
    </button>
  );
}