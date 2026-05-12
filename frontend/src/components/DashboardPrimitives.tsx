"use client";

import type { Contract } from "@/lib/types";
import { formatLabel, riskTone, workflowTone } from "@/lib/risk";
import { ArrowUpRight, FileText } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-[var(--ink-blue)]">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}

export function Badge({ value, tone }: { value?: string; tone?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${tone || "border-slate-200 bg-slate-50 text-slate-700"}`}>
      {formatLabel(value)}
    </span>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select
        className="mt-2 h-11 w-full rounded-lg border border-blue-100 bg-white px-3 text-sm font-semibold text-slate-700 outline-none ring-[var(--carrier-blue)] focus:ring-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ContractTable({
  contracts,
  onOpen,
  emptyText,
}: {
  contracts: Contract[];
  onOpen: (id: number) => void;
  emptyText: string;
}) {
  if (!contracts.length) {
    return (
      <div className="rounded-lg border border-dashed border-blue-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left">
          <thead className="bg-blue-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Contract</th>
              <th className="px-5 py-4">Vendor</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Risk</th>
              <th className="px-5 py-4">Workflow</th>
              <th className="px-5 py-4 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {contracts.map((contract) => (
              <tr
                className="cursor-pointer transition hover:bg-blue-50"
                key={contract.id}
                onClick={() => onOpen(contract.id)}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-[var(--carrier-blue)]">
                      <FileText size={18} />
                    </span>
                    <div>
                      <p className="font-black text-slate-900">{contract.filename}</p>
                      <p className="text-xs text-slate-500">ID RL-{contract.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-bold text-[var(--ink-blue)]">
                  {contract.vendor_name || "Unknown vendor"}
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{contract.document_type || "Other"}</td>
                <td className="px-5 py-4">
                  <Badge value={contract.risk_band} tone={riskTone(contract.risk_band)} />
                </td>
                <td className="px-5 py-4">
                  <Badge value={contract.workflow_status} tone={workflowTone(contract.workflow_status)} />
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="inline-flex items-center gap-2 font-black text-[var(--ink-blue)]">
                    {contract.overall_risk_score || 0}
                    <ArrowUpRight size={15} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
