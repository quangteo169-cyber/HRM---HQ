"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Item = { href: string; label: string; icon: string; roles?: string[] };
type Group = { title?: string; items: Item[] };

const NAV_GROUPS: Group[] = [
  {
    items: [{ href: "/dashboard", label: "Tổng quan", icon: "📊" }],
  },
  {
    title: "Nhân sự",
    items: [
      { href: "/employees", label: "Hồ sơ nhân sự", icon: "👥", roles: ["ADMIN", "HR", "MANAGER"] },
      { href: "/departments", label: "Phòng ban", icon: "🏢", roles: ["ADMIN", "HR"] },
    ],
  },
  {
    title: "Công & Ca",
    items: [
      { href: "/attendance", label: "Bảng chấm công", icon: "📅" },
      { href: "/attendance/import", label: "Nhập máy chấm công", icon: "📥", roles: ["ADMIN", "HR"] },
      { href: "/shifts", label: "Ca làm việc", icon: "🕐", roles: ["ADMIN", "HR"] },
      { href: "/shifts/register", label: "Đăng ký ca", icon: "📝" },
    ],
  },
  {
    title: "Chế độ",
    items: [
      { href: "/leaves", label: "Nghỉ phép", icon: "🌴" },
      { href: "/approvals", label: "Duyệt đơn", icon: "✅", roles: ["ADMIN", "HR", "MANAGER"] },
      { href: "/payroll", label: "Bảng lương", icon: "💰" },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { href: "/users", label: "Tài khoản & phân quyền", icon: "🔐", roles: ["ADMIN"] },
      { href: "/profile", label: "Hồ sơ của tôi", icon: "🙍" },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị hệ thống",
  HR: "Nhân sự (HR)",
  MANAGER: "Quản lý",
  EMPLOYEE: "Nhân viên",
};

export default function Sidebar({
  role,
  name,
  pendingCount,
}: {
  role: string;
  name: string;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-slate-900">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-black text-white shadow-lg shadow-blue-500/30">
          HQ
        </div>
        <div>
          <div className="text-sm font-bold text-white">HRM · HQ Group</div>
          <div className="text-[11px] text-slate-400">Quản trị nhân sự</div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter((i) => !i.roles || i.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={gi}>
              {group.title && (
                <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        active
                          ? "bg-blue-600/15 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-400 to-indigo-500" />
                      )}
                      <span className="text-base">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/approvals" && !!pendingCount && pendingCount > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-red-500/40">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{name}</div>
            <div className="text-[11px] text-slate-400">{ROLE_LABELS[role] ?? role}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          ⏻ Đăng xuất
        </button>
      </div>
    </aside>
  );
}
