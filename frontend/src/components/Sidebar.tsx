"use client";

import { useRouter } from "next/navigation";

export default function Sidebar({
  role,
}: {
  role: string;
}) {
  const router = useRouter();

  return (
    <div className="w-72 min-h-screen bg-white border-r border-blue-100 p-6">
      {/* LOGO */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-blue-700">
          RiskLens AI
        </h1>

        <p className="text-slate-500 mt-2">
          Procurement Intelligence
        </p>
      </div>

      {/* NAVIGATION */}
      <div className="space-y-3">
        {role === "analyst" ? (
          <>
            <SidebarButton
              title="Dashboard"
              onClick={() =>
                router.push(
                  "/analyst/dashboard"
                )
              }
            />

            <SidebarButton
              title="My Contracts"
              onClick={() =>
                router.push(
                  "/analyst/dashboard"
                )
              }
            />

            <SidebarButton
              title="Activity"
              onClick={() =>
                router.push(
                  "/analyst/dashboard"
                )
              }
            />
          </>
        ) : (
          <>
            <SidebarButton
              title="Approval Queue"
              onClick={() =>
                router.push(
                  "/manager/dashboard"
                )
              }
            />

            <SidebarButton
              title="Analytics"
              onClick={() =>
                router.push(
                  "/manager/dashboard"
                )
              }
            />

            <SidebarButton
              title="Vendors"
              onClick={() =>
                router.push(
                  "/manager/dashboard"
                )
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

function SidebarButton({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-5 py-4 rounded-2xl hover:bg-blue-50 text-slate-700 font-semibold transition"
    >
      {title}
    </button>
  );
}