"use client";

import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileSearch,
  Gauge,
  Home,
  LogOut,
  MailCheck,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

const analystItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: <Home size={18} /> },
  { id: "upload", label: "Upload", icon: <UploadCloud size={18} /> },
  { id: "contracts", label: "Contracts", icon: <FileSearch size={18} /> },
  { id: "insights", label: "Risk Insights", icon: <Gauge size={18} /> },
  
];

const managerItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: <Home size={18} /> },
  { id: "queue", label: "Approval Queue", icon: <ClipboardCheck size={18} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
  { id: "vendors", label: "Vendor Comms", icon: <MailCheck size={18} /> },
];

export default function AppShell({
  role,
  active,
  onChange,
  children,
}: {
  role: "analyst" | "manager";
  active: string;
  onChange: (view: string) => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const items = role === "analyst" ? analystItems : managerItems;

  return (
    <main className="min-h-screen bg-[var(--background)] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-blue-100 bg-white">
          <div className="flex h-full flex-col px-5 py-6">
            <button
  className="flex items-center gap-3 text-left"
  onClick={() => router.push("/")}
  type="button"
>
  <img
    src="/carrier_logo.png"
    alt="Carrier"
     className="h-20 w-28 rounded-lg object-contain "
  />
  <span>
    <span className="block text-2xl font-black text-[var(--ink-blue)]">RiskLens</span>
    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
      Contract Risk Intelligence
    </span>
  </span>
</button>

            <nav className="mt-10 space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition ${
                    active === item.id
                      ? "bg-[var(--carrier-blue)] text-white shadow-sm"
                      : "text-slate-600 hover:bg-blue-50 hover:text-[var(--ink-blue)]"
                  }`}
                  onClick={() => onChange(item.id)}
                  type="button"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <Building2 className="text-[var(--carrier-blue)]" size={20} />
                <div>
                  <p className="text-sm font-black text-[var(--ink-blue)]">Carrier Blue Desk</p>
                  <p className="text-xs text-slate-600">{role === "analyst" ? "Analyst" : "Manager"} access</p>
                </div>
              </div>
              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-[var(--ink-blue)]"
                onClick={() => router.push("/login")}
                type="button"
              >
                <LogOut size={16} />
                Switch role
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 px-5 py-5 sm:px-8 lg:px-10">{children}</section>
      </div>
    </main>
  );
}
