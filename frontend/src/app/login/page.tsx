"use client";

import { LockKeyhole, Mail, ShieldCheck, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("analyst@risklens.ai");
  const [password, setPassword] = useState("risklens");
  const [role, setRole] = useState<"analyst" | "manager">("analyst");

  const login = () => {
    const resolvedEmail = email.trim() || `${role}@risklens.ai`;

    localStorage.setItem("email", resolvedEmail);
    localStorage.setItem("role", role);
    localStorage.setItem("name", role === "analyst" ? "HVAC Analyst" : "Procurement Manager");

    router.push(role === "analyst" ? "/analyst/dashboard" : "/manager/dashboard");
  };

  return (
    <main className="grid min-h-screen bg-[var(--background)] text-slate-950 lg:grid-cols-[1fr_520px]">
      <section className="hidden border-r border-blue-100 bg-[var(--ink-blue)] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white text-[var(--ink-blue)]">
              <ShieldCheck size={25} />
            </span>
            <div>
              <p className="text-3xl font-black">RiskLens AI</p>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">HVAC governance</p>
            </div>
          </div>

          <h1 className="mt-20 max-w-2xl text-5xl font-black leading-tight">
            Sign in as analyst or manager and continue the procurement decision chain.
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {["Validation", "Risk score", "Approval"].map((item) => (
            <div className="rounded-lg border border-white/20 bg-white/10 p-4" key={item}>
              <p className="text-sm font-black">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-lg border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--carrier-blue)]">Secure demo login</p>
          <h2 className="mt-2 text-3xl font-black text-[var(--ink-blue)]">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use any dummy email and password. The selected role controls which workflow opens.
          </p>

          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Email</span>
              <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-blue-100 px-3">
                <Mail size={18} className="text-[var(--carrier-blue)]" />
                <input
                  className="min-w-0 flex-1 outline-none"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Password</span>
              <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-blue-100 px-3">
                <LockKeyhole size={18} className="text-[var(--carrier-blue)]" />
                <input
                  className="min-w-0 flex-1 outline-none"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Role</span>
              <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-blue-100 px-3">
                <UserRoundCog size={18} className="text-[var(--carrier-blue)]" />
                <select
                  className="min-w-0 flex-1 bg-white outline-none"
                  onChange={(event) => {
                    const nextRole = event.target.value as "analyst" | "manager";
                    setRole(nextRole);
                    setEmail(`${nextRole}@risklens.ai`);
                  }}
                  value={role}
                >
                  <option value="analyst">Analyst</option>
                  <option value="manager">Manager</option>
                </select>
              </span>
            </label>

            <button
              className="h-12 w-full rounded-lg bg-[var(--carrier-blue)] font-black text-white transition hover:bg-[var(--ink-blue)]"
              onClick={login}
              type="button"
            >
              Login
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
