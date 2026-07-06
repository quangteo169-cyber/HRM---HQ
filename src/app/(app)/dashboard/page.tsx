import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
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
    { label: "Nhân sự đang làm việc", value: totalEmployees, icon: "👥", href: "/employees" },
    { label: "Đi làm hôm nay", value: presentToday, icon: "🟢", href: "/attendance" },
    { label: "Nghỉ phép hôm nay", value: onLeaveToday, icon: "🌴", href: "/leaves" },
    { label: "Đơn chờ duyệt", value: pendingLeaves + pendingShifts, icon: "⏳", href: "/approvals" },
    { label: "Phòng ban", value: departments, icon: "🏢", href: "/departments" },
  ];

  const recentRequests = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { employee: true, leaveType: true },
  });

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${user.name ?? "bạn"}!`}
        subtitle={`Tổng quan hệ thống — ${MONTH_NAMES[now.getUTCMonth()]} năm ${now.getUTCFullYear()}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-4 transition-shadow hover:shadow-md">
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{c.value}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-700">Đơn nghỉ phép gần đây</h2>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có đơn nào.</p>
          ) : (
            <ul className="space-y-2">
              {recentRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    <b>{r.employee.fullName}</b> — {r.leaveType.name} ({fmtDate(r.startDate)} →{" "}
                    {fmtDate(r.endDate)})
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "PENDING"
                        ? "bg-amber-50 text-amber-700"
                        : r.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                    }`}
                  >
                    {r.status === "PENDING" ? "Chờ duyệt" : r.status === "APPROVED" ? "Đã duyệt" : "Từ chối"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-700">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/leaves" className="btn-secondary justify-start">🌴 Xin nghỉ phép</Link>
            <Link href="/shifts/register" className="btn-secondary justify-start">📝 Đăng ký ca</Link>
            <Link href="/attendance" className="btn-secondary justify-start">📅 Xem bảng công</Link>
            <Link href="/payroll" className="btn-secondary justify-start">💰 Xem bảng lương</Link>
            {["ADMIN", "HR"].includes(user.role) && (
              <>
                <Link href="/employees/new" className="btn-secondary justify-start">➕ Thêm nhân viên</Link>
                <Link href="/attendance/import" className="btn-secondary justify-start">📥 Nhập chấm công</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
