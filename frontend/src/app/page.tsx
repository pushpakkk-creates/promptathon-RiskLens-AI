"use client";

import { ArrowRight, Building2, FileCheck2, ShieldCheck, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";

const flow = [
  { title: "Upload HVAC contract", detail: "PDF procurement tender, AMC, SLA, or vendor agreement" },
  { title: "Validate document", detail: "Rejects resumes and irrelevant files through procurement keywords" },
  { title: "Analyze risk", detail: "Extracts KPIs, missing clauses, vendor criteria, and risk bands" },
  { title: "Manager decision", detail: "Approves, rejects, or sends negotiation mail to the vendor" },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[var(--background)] text-slate-950">
      <nav className="flex items-center justify-between border-b border-blue-100 bg-white px-5 py-4 sm:px-10">
        <button className="flex items-center gap-3" onClick={() => router.push("/")} type="button">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--ink-blue)] text-white">
            <ShieldCheck size={22} />
          </span>
          <span className="text-left">
            <span className="block text-2xl font-black text-[var(--ink-blue)]">RiskLens AI</span>
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Procurement Governance
            </span>
          </span>
        </button>

        <button
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--carrier-blue)] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[var(--ink-blue)]"
          onClick={() => router.push("/login")}
          type="button"
        >
          Login
          <ArrowRight size={16} />
        </button>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <div className="flex min-h-[560px] flex-col justify-center">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--carrier-blue)]">
            <Building2 size={16} />
            Carrier Blue HVAC Desk
          </p>
          <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.02] text-[var(--ink-blue)] sm:text-6xl">
            RiskLens AI
          </h1>
          <p className="mt-5 max-w-2xl text-xl font-semibold leading-8 text-slate-650">
            A role-based HVAC procurement cockpit for contract validation, clause risk scoring, vendor selection,
            analyst escalation, and manager approval.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--carrier-blue)] px-6 py-4 font-black text-white shadow-sm transition hover:bg-[var(--ink-blue)]"
              onClick={() => router.push("/login")}
              type="button"
            >
              Start Review
              <ArrowRight size={18} />
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-6 py-4 font-black text-[var(--ink-blue)]"
              onClick={() => router.push("/manager/dashboard")}
              type="button"
            >
              Manager Queue
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-blue-100 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Live workflow</p>
              <h2 className="mt-1 text-2xl font-black text-[var(--ink-blue)]">Procurement governance flow</h2>
            </div>
            <Workflow className="text-[var(--carrier-blue)]" size={28} />
          </div>

          <div className="mt-6 space-y-4">
            {flow.map((item, index) => (
              <div className="grid grid-cols-[44px_1fr] gap-4" key={item.title}>
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-lg font-black text-[var(--carrier-blue)]">
                  {index + 1}
                </span>
                <div className="rounded-lg border border-blue-100 bg-[#fbfdff] p-4">
                  <p className="font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Low", "High", "Critical"].map((risk) => (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4" key={risk}>
                <FileCheck2 className="text-[var(--carrier-blue)]" size={20} />
                <p className="mt-3 text-sm font-black text-[var(--ink-blue)]">{risk} risk routing</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
