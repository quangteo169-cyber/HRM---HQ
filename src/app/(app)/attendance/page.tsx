import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { FlashMessage, PageHeader } from "@/components/ui";
import { daysInMonth, fmtTime } from "@/lib/utils";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string; message?: string; error?: string };
}) {
  const user = await requireUser();
  const now = new Date();
  const month = Number(searchParams.month) || now.getUTCMonth() + 1;
  const year = Number(searchParams.year) || now.getUTCFullYear();
  const totalDays = daysInMonth(year, month);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  // Phạm vi xem theo vai trò
  let employeeFilter: any = { status: { not: "INACTIVE" } };
  if (user.role === "EMPLOYEE") {
    employeeFilter = { id: user.employeeId ?? "___" };
  } else if (user.role === "MANAGER") {
    employeeFilter = {
      status: { not: "INACTIVE" },
      OR: [
        { department: { managerId: user.employeeId ?? "___" } },
        { id: user.employeeId ?? "___" },
      ],
    };
  }

  const employees = await prisma.employee.findMany({
    where: employeeFilter,
    include: {
      attendanceDays: { where: { date: { gte: start, lt: end } } },
    },
    orderBy: { code: "asc" },
  });

  const prevMonth = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
  const nextMonth = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };

  return (
    <div>
      <PageHeader title="Bảng chấm công" subtitle={`Tháng ${month}/${year}`}>
        <Link href={`/attendance?month=${prevMonth.m}&year=${prevMonth.y}`} className="btn-secondary">
          ← Tháng trước
        </Link>
        <Link href={`/attendance?month=${nextMonth.m}&year=${nextMonth.y}`} className="btn-secondary">
          Tháng sau →
        </Link>
        {CAN_MANAGE_HR.includes(user.role) && (
          <Link href="/attendance/import" className="btn-primary">
            📥 Nhập dữ liệu máy chấm công
          </Link>
        )}
      </PageHeader>

      <FlashMessage message={searchParams.message} error={searchParams.error} />

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <span><b className="text-emerald-600">Số giờ</b> = đi làm</span>
        <span><b className="text-blue-600">P</b> = nghỉ phép</span>
        <span><b className="text-red-500">V</b> = vắng không phép</span>
        <span className="text-slate-400">Ô xám = cuối tuần</span>
        <span><b className="text-amber-600">+giờ</b> = tăng ca (OT)</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th sticky left-0 z-10 bg-slate-50">Nhân viên</th>
              {Array.from({ length: totalDays }, (_, i) => (
                <th key={i} className="th px-1 text-center">
                  {i + 1}
                </th>
              ))}
              <th className="th text-center">Công</th>
              <th className="th text-center">OT</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td className="td text-center text-slate-400" colSpan={totalDays + 3}>
                  Không có dữ liệu
                </td>
              </tr>
            )}
            {employees.map((emp) => {
              const byDay = new Map(
                emp.attendanceDays.map((d) => [d.date.getUTCDate(), d])
              );
              let totalWork = 0;
              let totalOt = 0;
              for (const d of emp.attendanceDays) {
                if (d.status === "PRESENT") {
                  totalWork += Math.min(1, Math.round((d.workHours / 8) * 2) / 2);
                }
                totalOt += d.otHours;
              }
              return (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="td sticky left-0 z-10 whitespace-nowrap bg-white font-medium">
                    {emp.fullName}
                    <span className="ml-1 font-mono text-xs text-slate-400">{emp.code}</span>
                  </td>
                  {Array.from({ length: totalDays }, (_, i) => {
                    const day = byDay.get(i + 1);
                    const date = new Date(Date.UTC(year, month - 1, i + 1));
                    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
                    let content: React.ReactNode = "";
                    let cls = "";
                    if (day?.status === "PRESENT") {
                      content = (
                        <span title={`Vào ${fmtTime(day.checkIn)} - Ra ${fmtTime(day.checkOut)}${day.lateMinutes > 0 ? ` (muộn ${day.lateMinutes}p)` : ""}`}>
                          <span className="text-emerald-600">{day.workHours}</span>
                          {day.otHours > 0 && <span className="text-amber-600">+{day.otHours}</span>}
                        </span>
                      );
                    } else if (day?.status === "LEAVE") {
                      content = <span className="font-bold text-blue-600" title={day.note ?? "Nghỉ phép"}>P</span>;
                    } else if (day?.status === "ABSENT" && !weekend) {
                      content = <span className="font-bold text-red-500">V</span>;
                    }
                    if (weekend) cls = "bg-slate-50";
                    return (
                      <td key={i} className={`td px-1 text-center text-xs ${cls}`}>
                        {content}
                      </td>
                    );
                  })}
                  <td className="td text-center font-bold">{totalWork}</td>
                  <td className="td text-center font-bold text-amber-600">
                    {totalOt > 0 ? totalOt : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
