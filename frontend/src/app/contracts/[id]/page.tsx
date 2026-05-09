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

  if (!contract) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-xl">
        Loading Contract Intelligence...
      </div>
    );
  }

  const risk = contract.risk_breakdown;

  return (
    <main className="min-h-screen bg-black text-white p-8">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-5xl font-bold">
          Contract Intelligence Workspace
        </h1>

        <p className="text-gray-400 mt-3">
          {contract.filename}
        </p>
      </div>

      {/* Risk Hero */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">
        <h2 className="text-4xl font-bold text-yellow-400">
          {contract.risk_band}
        </h2>

        <p className="text-2xl mt-4">
          Recommendation:{" "}
          <span className="font-bold text-blue-400">
            {contract.recommendation}
          </span>
        </p>

        <p className="text-gray-400 mt-4">
          Overall Risk Score: {contract.overall_risk_score}/100
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card title="Document Type" value={contract.document_type} />
        <Card title="Contract Value" value={`${contract.currency} ${contract.contract_value}`} />
        <Card title="EMD" value={contract.emd_amount || "N/A"} />
        <Card title="Security Deposit" value={`${contract.security_deposit_percent}%`} />
        <Card title="Retention" value={`${contract.retention_percent}%`} />
        <Card title="Duration" value={`${contract.contract_duration_months} months`} />
      </div>

      {/* Risk Breakdown */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">
        <h2 className="text-2xl font-bold mb-6">
          Risk Breakdown
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <RiskCard title="Commercial" value={risk.commercial} />
          <RiskCard title="Operational" value={risk.operational} />
          <RiskCard title="Legal" value={risk.legal} />
          <RiskCard title="Vendor" value={risk.vendor} />
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">
        <h2 className="text-2xl font-bold mb-4">
          Executive Summary
        </h2>

        <p className="text-gray-300 leading-8">
          {contract.executive_summary}
        </p>
      </div>

      {/* Missing Clauses */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">
        <h2 className="text-2xl font-bold mb-6 text-red-400">
          Missing Clauses
        </h2>

        <div className="flex flex-wrap gap-3">
          {contract.missing_clauses.map((clause, index) => (
            <span
              key={index}
              className="bg-red-900 text-red-300 px-4 py-2 rounded-full"
            >
              {clause}
            </span>
          ))}
        </div>
      </div>

      {/* Risk Reasons */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
        <h2 className="text-2xl font-bold mb-6">
          Risk Insights
        </h2>

        <div className="space-y-4">
          {contract.risk_reasons.map((reason, index) => (
            <div
              key={index}
              className="bg-zinc-800 rounded-2xl p-4"
            >
              ⚠ {reason}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  value
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
      <h3 className="text-gray-400 text-sm uppercase">
        {title}
      </h3>

      <p className="text-2xl font-bold mt-3">
        {value}
      </p>
    </div>
  );
}

function RiskCard({
  title,
  value
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="bg-zinc-800 rounded-3xl p-6 text-center">
      <h3 className="text-gray-400">
        {title}
      </h3>

      <p className="text-4xl font-bold mt-4 text-blue-400">
        {value}
      </p>
    </div>
  );
}