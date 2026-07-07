import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Avatar, StatusBadge } from "@/components/ui";
import { fmtDate, MONTH_NAMES } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [totalEmployees, presentToday, onLeaveToday, pendingLeaves, pendingShifts, departments] =
    await Promise.all([
      prisma.employee.count({ where: { status: { not: "INACTIVE" } } }),
      prisma.attendanceDay.count({ where: { date: today, status: "PRESENT" } }),
      prisma.leaveRequest.count({
        where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
      }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.shiftRegistration.count({ where: { status: "PENDING" } }),
      prisma.department.count(),
    ]);

  const cards = [
    {
      label: "Nhân sự đang làm việc",
      value: totalEmployees,
      icon: "👥",
      href: "/employees",
      bubble: "bg-blue-50 text-blue-600",
      ring: "hover:ring-blue-200",
    },
    {
      label: "Đi làm hôm nay",
      value: presentToday,
      icon: "🟢",
      href: "/attendance",
      bubble: "bg-emerald-50 text-emerald-600",
      ring: "hover:ring-emerald-200",
    },
    {
      label: "Nghỉ phép hôm nay",
      value: onLeaveToday,
      icon: "🌴",
      href: "/leaves",
      bubble: "bg-cyan-50 text-cyan-600",
      ring: "hover:ring-cyan-200",
    },
    {
      label: "Đơn chờ duyệt",
      value: pendingLeaves + pendingShifts,
      icon: "⏳",
      href: "/approvals",
      bubble: "bg-amber-50 text-amber-600",
      ring: "hover:ring-amber-200",
    },
    {
      label: "Phòng ban",
      value: departments,
      icon: "🏢",
      href: "/departments",
      bubble: "bg-violet-50 text-violet-600",
      ring: "hover:ring-violet-200",
    },
  ];

  const recentRequests = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { employee: true, leaveType: true },
  });

  const hour = now.getUTCHours() + 7; // giờ Việt Nam
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <div>
      {/* Banner chào mừng */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-7 text-white shadow-lg shadow-blue-600/20">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <h1 className="text-2xl font-bold">
          {greeting}, {user.name ?? "bạn"}! 👋
        </h1>
        <p className="mt-1 text-sm text-blue-100">
          Tổng quan hệ thống nhân sự HQ Group — {MONTH_NAMES[now.getUTCMonth()]} năm{" "}
          {now.getUTCFullYear()}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/leaves"
            className="rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/25"
          >
            🌴 Xin nghỉ phép
          </Link>
          <Link
            href="/shifts/register"
            className="rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/25"
          >
            📝 Đăng ký ca
          </Link>
          {["ADMIN", "HR"].includes(user.role) && (
            <>
              <Link
                href="/employees/new"
                className="rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/25"
              >
                ➕ Thêm nhân viên
              </Link>
              <Link
                href="/attendance/import"
                className="rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/25"
              >
                📥 Nhập chấm công
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`card p-5 ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:shadow-md ${c.ring}`}
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${c.bubble}`}
            >
              {c.icon}
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{c.value}</div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Đơn nghỉ phép gần đây */}
      <div className="mt-6 card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Đơn nghỉ phép gần đây</h2>
          <Link href="/leaves" className="text-sm font-medium text-blue-600 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {recentRequests.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Chưa có đơn nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentRequests.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <Avatar name={r.employee.fullName} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">
                    {r.employee.fullName}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {r.leaveType.name} · {fmtDate(r.startDate)} → {fmtDate(r.endDate)} ({r.days}{" "}
                    ngày)
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
