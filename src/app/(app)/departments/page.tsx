import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { createDepartment, setDepartmentManager, deleteDepartment } from "@/actions/departments";
import { FlashMessage, PageHeader } from "@/components/ui";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  await requireUser(CAN_MANAGE_HR);

  const [departments, employees] = await Promise.all([
    prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { status: { not: "INACTIVE" } },
      orderBy: { fullName: "asc" },
    }),
  ]);
  const empById = new Map(employees.map((e) => [e.id, e]));

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Phòng ban"
        subtitle="Trưởng phòng là người duyệt đơn nghỉ phép / đăng ký ca của nhân viên trong phòng"
      />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      <form action={createDepartment} className="card mb-4 flex items-end gap-2 p-4">
        <div className="flex-1">
          <label className="label">Tên phòng ban mới</label>
          <input name="name" className="input" placeholder="VD: Phòng Marketing" required />
        </div>
        <button type="submit" className="btn-primary">
          ➕ Tạo phòng ban
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="th">Phòng ban</th>
              <th className="th">Số nhân viên</th>
              <th className="th">Trưởng phòng (người duyệt đơn)</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td className="td font-medium">{d.name}</td>
                <td className="td">{d._count.employees}</td>
                <td className="td">
                  <form action={setDepartmentManager} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={d.id} />
                    <select name="managerId" className="input max-w-xs" defaultValue={d.managerId ?? ""}>
                      <option value="">— Chưa gán —</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.fullName} ({e.code})
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-secondary">
                      Lưu
                    </button>
                  </form>
                  {d.managerId && empById.get(d.managerId) && (
                    <p className="mt-1 text-xs text-slate-400">
                      Hiện tại: {empById.get(d.managerId)!.fullName}
                    </p>
                  )}
                </td>
                <td className="td text-right">
                  <form action={deleteDepartment}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="btn-danger">
                      Xóa
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
