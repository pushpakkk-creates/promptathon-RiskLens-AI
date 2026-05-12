import type { Contract } from "@/lib/types";

export const riskBands = [
  "ALL",
  "LOW PROCUREMENT RISK",
  "MODERATE PROCUREMENT RISK",
  "HIGH PROCUREMENT RISK",
  "CRITICAL PROCUREMENT RISK",
];

export const workflowStatuses = [
  "ALL",
  "AI_ANALYZED",
  "PENDING_MANAGER_REVIEW",
  "ESCALATED",
  "APPROVED",
  "REJECTED",
  "SENT_BACK",
];

export const documentTypes = ["ALL", "SLA", "AMC", "Tender", "Other"];

export function riskTone(risk?: string) {
  if (!risk) return "bg-slate-100 text-slate-700 border-slate-200";
  if (risk.includes("CRITICAL")) return "bg-red-50 text-red-700 border-red-200";
  if (risk.includes("HIGH")) return "bg-orange-50 text-orange-700 border-orange-200";
  if (risk.includes("MODERATE")) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export function workflowTone(workflow?: string) {
  if (workflow === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (workflow === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  if (workflow === "ESCALATED") return "bg-orange-50 text-orange-700 border-orange-200";
  if (workflow === "SENT_BACK") return "bg-amber-50 text-amber-700 border-amber-200";
  if (workflow === "PENDING_MANAGER_REVIEW") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export function formatLabel(value?: string) {
  if (!value) return "Not specified";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function countByRisk(contracts: Contract[]) {
  return {
    low: contracts.filter((contract) => contract.risk_band?.includes("LOW")).length,
    moderate: contracts.filter((contract) => contract.risk_band?.includes("MODERATE")).length,
    high: contracts.filter((contract) => contract.risk_band?.includes("HIGH")).length,
    critical: contracts.filter((contract) => contract.risk_band?.includes("CRITICAL")).length,
  };
}

export function averageRisk(contracts: Contract[]) {
  if (!contracts.length) return 0;
  const total = contracts.reduce((sum, contract) => sum + (contract.overall_risk_score || 0), 0);
  return Math.round(total / contracts.length);
}
