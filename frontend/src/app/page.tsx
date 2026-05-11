"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type SummaryData = {
  total_contracts: number;
  low_risk: number;
  moderate_risk: number;
  high_risk: number;
  critical_risk: number;
  average_risk_score: number;
};

type Contract = {
  id: number;
  filename: string;
  document_type: string;
  vendor_name: string;
  contract_value: string;
  currency: string;
  overall_risk_score: number;
  risk_band: string;
  recommendation: string;
  status: string;
  created_at: string;
};

export default function Home() {
  const router = useRouter();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSummary();
    fetchContracts();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await api.get("/dashboard/summary");
      setSummary(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await api.get("/dashboard/contracts");
      setContracts(response.data);
    } catch (error) {
      console.error(error);
    }
  };

const uploadContract = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];

  if (!file) return;

  try {
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
      "/contracts/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    router.push(`/contracts/${response.data.contract_id}`);
  } catch (error: any) {
    console.error(error);

    if (error.response?.data?.detail) {
      setError(error.response.data.detail);
    } else {
      setError(
        "Upload failed. Please upload a valid procurement contract PDF."
      );
    }
  } finally {
    setUploading(false);
  }
};

  const getRiskBadge = (risk: string) => {
    if (risk === "CRITICAL PROCUREMENT RISK") {
      return "bg-red-950 text-red-400";
    }

    if (risk === "HIGH PROCUREMENT RISK") {
      return "bg-orange-950 text-orange-400";
    }

    if (risk === "MODERATE PROCUREMENT RISK") {
      return "bg-yellow-900 text-yellow-400";
    }

    return "bg-green-900 text-green-400";
  };

  const getStatusBadge = (status: string) => {
    if (status === "APPROVED") {
      return "bg-green-950 text-green-400";
    }

    if (status === "REJECTED") {
      return "bg-red-950 text-red-400";
    }

    if (status === "ESCALATED") {
      return "bg-orange-950 text-orange-400";
    }

    return "bg-yellow-900 text-yellow-400";
  };

  if (!summary) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-xl">
        Loading RiskLens AI...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">
            RiskLens AI
          </h1>

          <p className="text-gray-400 mt-3 text-lg">
            AI-Powered Procurement Risk Intelligence Platform
          </p>
        </div>

        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-semibold transition">
          {uploading ? "Analyzing..." : "Upload Contract"}

          <input
            type="file"
            accept=".pdf"
            onChange={uploadContract}
            className="hidden"
          />
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-2xl max-w-3xl">
          <p className="font-bold text-lg">
            Invalid Upload
          </p>

          <p className="mt-2 text-sm">
            {error}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
        <MetricCard
          title="Total Contracts"
          value={summary.total_contracts}
        />

        <MetricCard
          title="Low Risk"
          value={summary.low_risk}
        />

        <MetricCard
          title="Moderate Risk"
          value={summary.moderate_risk}
        />

        <MetricCard
          title="High Risk"
          value={summary.high_risk}
        />

        <MetricCard
          title="Critical Risk"
          value={summary.critical_risk}
        />
      </div>

      {/* Portfolio Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-6">
          Contract Portfolio
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-zinc-800">
                <th className="pb-4">File</th>
                <th className="pb-4">Type</th>
                <th className="pb-4">Value</th>
                <th className="pb-4">Risk Score</th>
                <th className="pb-4">Risk Band</th>
                <th className="pb-4">Recommendation</th>
                <th className="pb-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() =>
                    router.push(`/contracts/${contract.id}`)
                  }
                  className="border-b border-zinc-800 hover:bg-zinc-800 transition cursor-pointer"
                >
                  <td className="py-4">
                    {contract.filename}
                  </td>

                  <td className="py-4">
                    {contract.document_type}
                  </td>

                  <td className="py-4">
                    {contract.currency} {contract.contract_value}
                  </td>

                  <td className="py-4">
                    {contract.overall_risk_score}
                  </td>

                  <td className="py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskBadge(
                        contract.risk_band
                      )}`}
                    >
                      {contract.risk_band}
                    </span>
                  </td>

                  <td className="py-4">
                    {contract.recommendation}
                  </td>

                  <td className="py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(
                        contract.status
                      )}`}
                    >
                      {contract.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
      <h3 className="text-gray-400 text-sm uppercase">
        {title}
      </h3>

      <p className="text-3xl font-bold mt-3">
        {value}
      </p>
    </div>
  );
}