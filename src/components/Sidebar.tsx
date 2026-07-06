"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Item = { href: string; label: string; icon: string; roles?: string[] };

const NAV_ITEMS: Item[] = [
  { href: "/dashboard", label: "Tổng quan", icon: "📊" },
  { href: "/employees", label: "Hồ sơ nhân sự", icon: "👥", roles: ["ADMIN", "HR", "MANAGER"] },
  { href: "/departments", label: "Phòng ban", icon: "🏢", roles: ["ADMIN", "HR"] },
  { href: "/shifts", label: "Ca làm việc", icon: "🕐", roles: ["ADMIN", "HR"] },
  { href: "/shifts/register", label: "Đăng ký ca", icon: "📝" },
  { href: "/attendance", label: "Bảng chấm công", icon: "📅" },
  { href: "/attendance/import", label: "Nhập máy chấm công", icon: "📥", roles: ["ADMIN", "HR"] },
  { href: "/leaves", label: "Nghỉ phép", icon: "🌴" },
  { href: "/approvals", label: "Duyệt đơn", icon: "✅", roles: ["ADMIN", "HR", "MANAGER"] },
  { href: "/payroll", label: "Bảng lương", icon: "💰" },
  { href: "/users", label: "Tài khoản & phân quyền", icon: "🔐", roles: ["ADMIN"] },
  { href: "/profile", label: "Hồ sơ của tôi", icon: "🙍" },
];

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
  const items = NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black text-white">
          HQ
        </div>
        <div>
          <div className="text-sm font-bold text-slate-800">HRM - HQ Group</div>
          <div className="text-xs text-slate-400">Quản trị nhân sự</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/approvals" && !!pendingCount && pendingCount > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-2 truncate text-sm font-semibold text-slate-700">{name}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-secondary w-full"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
