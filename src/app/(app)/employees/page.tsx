import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { Avatar, FlashMessage, PageHeader, StatusBadge } from "@/components/ui";
import { fmtDate, fmtMoney } from "@/lib/utils";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { q?: string; message?: string; error?: string };
}) {
  const user = await requireUser(["ADMIN", "HR", "MANAGER"]);
  const q = searchParams.q?.trim();

  // Quản lý chỉ xem nhân viên trong phòng mình quản lý
  const managerFilter =
    user.role === "MANAGER"
      ? { department: { managerId: user.employeeId ?? "___" } }
      : {};

  const employees = await prisma.employee.findMany({
    where: {
      ...managerFilter,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" as const } },
              { code: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { department: true },
    orderBy: { code: "asc" },
  });

  const canEdit = CAN_MANAGE_HR.includes(user.role);

  return (
    <div>
      <PageHeader title="Hồ sơ nhân sự" subtitle={`${employees.length} nhân viên`}>
        {canEdit && (
          <Link href="/employees/new" className="btn-primary">
            ➕ Thêm nhân viên
          </Link>
        )}
      </PageHeader>

      <FlashMessage message={searchParams.message} error={searchParams.error} />

      <form className="mb-4 flex max-w-md gap-2">
        <input
          name="q"
          className="input"
          placeholder="Tìm theo tên hoặc mã nhân viên..."
          defaultValue={q}
        />
        <button className="btn-secondary" type="submit">
          Tìm
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="th">Mã NV</th>
              <th className="th">Họ tên</th>
              <th className="th">Phòng ban</th>
              <th className="th">Chức vụ</th>
              <th className="th">Ngày vào</th>
              {canEdit && <th className="th">Lương cơ bản</th>}
              <th className="th">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td className="td text-center text-slate-400" colSpan={7}>
                  Chưa có nhân viên nào
                </td>
              </tr>
            )}
            {employees.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="td font-mono">{e.code}</td>
                <td className="td">
                  <Link href={`/employees/${e.id}`} className="flex items-center gap-2.5 font-medium text-slate-800 hover:text-blue-600">
                    <Avatar name={e.fullName} size="sm" />
                    {e.fullName}
                  </Link>
                </td>
                <td className="td">{e.department?.name ?? "—"}</td>
                <td className="td">{e.position ?? "—"}</td>
                <td className="td">{fmtDate(e.joinDate)}</td>
                {canEdit && <td className="td">{fmtMoney(e.baseSalary)} đ</td>}
                <td className="td">
                  <StatusBadge status={e.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
