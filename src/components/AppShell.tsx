"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({
  role,
  name,
  pendingCount,
  today,
  children,
}: {
  role: string;
  name: string;
  pendingCount?: number;
  today: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Lớp phủ khi mở menu trên mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar: cố định trên desktop, trượt ra trên mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          role={role}
          name={name}
          pendingCount={pendingCount}
          onNavigate={() => setOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Mở menu"
            >
              ☰
            </button>
            <div className="truncate text-sm font-bold text-slate-800 sm:hidden">
              HRM · HQ Group
            </div>
            <div className="hidden text-sm capitalize text-slate-500 sm:block">📆 {today}</div>
          </div>
          <div className="hidden max-w-[40%] truncate text-sm font-medium text-slate-600 sm:block">
            {name}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
