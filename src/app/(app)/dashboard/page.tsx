import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { reviewLeaveRequest } from "@/actions/leaves";
import { reviewShiftRegistration } from "@/actions/shifts";
import { Avatar, FlashMessage, StatusBadge } from "@/components/ui";
import { fmtDate, MONTH_NAMES } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  const user = await requireUser();
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const canApprove = ["ADMIN", "HR", "MANAGER"].includes(user.role);

  const managerFilter =
    user.role === "MANAGER"
      ? { employee: { department: { managerId: user.employeeId ?? "___" } } }
      : {};

  const [totalEmployees, presentToday, onLeaveToday, departments] = await Promise.all([
    prisma.employee.count({ where: { status: { not: "INACTIVE" } } }),
    prisma.attendanceDay.count({ where: { date: today, status: "PRESENT" } }),
    prisma.leaveRequest.count({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
    }),
    prisma.department.count(),
  ]);

  // Việc cần làm: đơn chờ duyệt (theo phạm vi quản lý)
  const [pendingLeaves, pendingShifts] = canApprove
    ? await Promise.all([
        prisma.leaveRequest.findMany({
          where: { status: "PENDING", ...managerFilter },
          include: { employee: true, leaveType: true },
          orderBy: { createdAt: "asc" },
          take: 5,
        }),
        prisma.shiftRegistration.findMany({
          where: { status: "PENDING", ...managerFilter },
          include: { employee: true, shift: true },
          orderBy: { createdAt: "asc" },
          take: 5,
        }),
      ])
    : [[], []];

  // Bảng tin công ty (chịu được trường hợp bảng chưa tạo trên DB)
  const announcements = await prisma.announcement
    .findMany({ orderBy: { createdAt: "desc" }, take: 3 })
    .catch(() => []);

  // Lịch 14 ngày tới: sinh nhật + nhân viên bắt đầu nghỉ phép
  const employees = await prisma.employee.findMany({
    where: { status: { not: "INACTIVE" }, dob: { not: null } },
    select: { fullName: true, dob: true },
  });
  const in14 = new Date(today.getTime() + 14 * 86400000);
  type CalEvent = { date: Date; label: string; icon: string; who: string };
  const events: CalEvent[] = [];
  for (const e of employees) {
    if (!e.dob) continue;
    for (const y of [today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
      const bday = new Date(Date.UTC(y, e.dob.getUTCMonth(), e.dob.getUTCDate()));
      if (bday >= today && bday <= in14) {
        events.push({ date: bday, label: "Sinh nhật", icon: "🎂", who: e.fullName });
      }
    }
  }
  const upcomingLeaves = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED", startDate: { gte: today, lte: in14 } },
    include: { employee: true, leaveType: true },
    take: 10,
  });
  for (const l of upcomingLeaves) {
    events.push({
      date: l.startDate,
      label: `${l.leaveType.name} (${l.days} ngày)`,
      icon: "🌴",
      who: l.employee.fullName,
    });
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const hour = now.getUTCHours() + 7;
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  const cards = [
    { label: "Nhân sự đang làm việc", value: totalEmployees, icon: "👥", href: "/employees", bubble: "bg-blue-50 text-blue-600" },
    { label: "Đi làm hôm nay", value: presentToday, icon: "🟢", href: "/attendance", bubble: "bg-emerald-50 text-emerald-600" },
    { label: "Nghỉ phép hôm nay", value: onLeaveToday, icon: "🌴", href: "/leaves", bubble: "bg-cyan-50 text-cyan-600" },
    { label: "Phòng ban", value: departments, icon: "🏢", href: "/departments", bubble: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div>
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      {/* Banner chào mừng */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-blue-600/20 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <h1 className="text-xl font-bold sm:text-2xl">
          {greeting}, {user.name ?? "bạn"}! 👋
        </h1>
        <p className="mt-1 text-sm text-blue-100">
          {MONTH_NAMES[now.getUTCMonth()]} năm {now.getUTCFullYear()} — HQ Group
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/leaves" className="rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/25">🌴 Xin nghỉ phép</Link>
          <Link href="/shifts/register" className="rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/25">📝 Đăng ký ca</Link>
          {["ADMIN", "HR"].includes(user.role) && (
            <Link href="/attendance/import" className="rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/25">📥 Nhập chấm công</Link>
          )}
        </div>
      </div>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${c.bubble}`}>{c.icon}</div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{c.value}</div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Cột trái (2/3): Việc cần làm + Bảng tin */}
        <div className="space-y-5 xl:col-span-2">
          {canApprove && (
            <div className="card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">
                  ⏳ Việc cần làm{" "}
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    {pendingLeaves.length + pendingShifts.length}
                  </span>
                </h2>
                <Link href="/approvals" className="text-sm font-medium text-blue-600 hover:underline">
                  Xem tất cả →
                </Link>
              </div>
              {pendingLeaves.length + pendingShifts.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Không có đơn nào chờ duyệt 🎉</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pendingLeaves.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                      <Avatar name={r.employee.fullName} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-800">{r.employee.fullName}</div>
                        <div className="text-xs text-slate-500">
                          Đơn nghỉ phép · {r.leaveType.name} · {fmtDate(r.startDate)} → {fmtDate(r.endDate)} ({r.days} ngày)
                          {r.reason ? ` · ${r.reason}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <form action={reviewLeaveRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="approve" />
                          <input type="hidden" name="back" value="/dashboard" />
                          <button type="submit" className="btn-success !px-3 !py-1.5">✓ Duyệt</button>
                        </form>
                        <form action={reviewLeaveRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="reject" />
                          <input type="hidden" name="back" value="/dashboard" />
                          <button type="submit" className="btn-danger !px-3 !py-1.5">✕</button>
                        </form>
                      </div>
                    </li>
                  ))}
                  {pendingShifts.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                      <Avatar name={r.employee.fullName} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-800">{r.employee.fullName}</div>
                        <div className="text-xs text-slate-500">
                          Đăng ký ca · {r.shift.name} · {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <form action={reviewShiftRegistration}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="approve" />
                          <input type="hidden" name="back" value="/dashboard" />
                          <button type="submit" className="btn-success !px-3 !py-1.5">✓ Duyệt</button>
                        </form>
                        <form action={reviewShiftRegistration}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="reject" />
                          <input type="hidden" name="back" value="/dashboard" />
                          <button type="submit" className="btn-danger !px-3 !py-1.5">✕</button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">📢 Thông báo công ty</h2>
              <Link href="/announcements" className="text-sm font-medium text-blue-600 hover:underline">
                Xem tất cả →
              </Link>
            </div>
            {announcements.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Chưa có thông báo nào.{" "}
                {["ADMIN", "HR"].includes(user.role) && (
                  <Link href="/announcements" className="text-blue-600 hover:underline">
                    Đăng thông báo đầu tiên →
                  </Link>
                )}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {announcements.map((a) => (
                  <li key={a.id} className="py-3">
                    <div className="flex items-center gap-2">
                      {a.tag && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                          {a.tag}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-slate-800">{a.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.content}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {a.authorName} · {fmtDate(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Cột phải (1/3): Lịch sự kiện */}
        <div className="card h-fit p-5 sm:p-6">
          <h2 className="mb-4 font-bold text-slate-800">
            🗓️ {WEEKDAYS[today.getUTCDay()]}, {fmtDate(today)}
          </h2>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            14 ngày tới
          </div>
          {events.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Không có sự kiện nào</p>
          ) : (
            <ul className="space-y-3">
              {events.slice(0, 8).map((ev, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      {ev.date.getUTCDate()}/{ev.date.getUTCMonth() + 1}
                    </span>
                    <span className="text-sm leading-none">{ev.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{ev.who}</div>
                    <div className="text-xs text-slate-500">{ev.label}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
