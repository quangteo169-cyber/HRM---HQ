import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { createShift, deleteShift } from "@/actions/shifts";
import { FlashMessage, PageHeader } from "@/components/ui";

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  await requireUser(CAN_MANAGE_HR);
  const shifts = await prisma.shift.findMany({
    include: { _count: { select: { registrations: true } } },
    orderBy: { code: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Ca làm việc"
        subtitle="Định nghĩa các ca làm việc. Nhân viên không đăng ký ca sẽ áp dụng giờ hành chính 08:00 - 17:30."
      />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      <form action={createShift} className="card mb-4 grid grid-cols-2 items-end gap-3 p-4 lg:grid-cols-6">
        <div>
          <label className="label">Mã ca *</label>
          <input name="code" className="input" placeholder="CA3" required />
        </div>
        <div className="col-span-2">
          <label className="label">Tên ca *</label>
          <input name="name" className="input" placeholder="Ca đêm (22:00 - 06:00)" required />
        </div>
        <div>
          <label className="label">Giờ vào *</label>
          <input type="time" name="startTime" className="input" required />
        </div>
        <div>
          <label className="label">Giờ ra *</label>
          <input type="time" name="endTime" className="input" required />
        </div>
        <div>
          <label className="label">Nghỉ giữa ca (phút)</label>
          <input type="number" name="breakMinutes" className="input" defaultValue={60} min={0} />
        </div>
        <div className="col-span-2 lg:col-span-6">
          <button type="submit" className="btn-primary">
            ➕ Thêm ca làm việc
          </button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              <th className="th">Mã ca</th>
              <th className="th">Tên ca</th>
              <th className="th">Giờ vào</th>
              <th className="th">Giờ ra</th>
              <th className="th">Nghỉ giữa ca</th>
              <th className="th">Lượt đăng ký</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id}>
                <td className="td font-mono">{s.code}</td>
                <td className="td font-medium">{s.name}</td>
                <td className="td">{s.startTime}</td>
                <td className="td">{s.endTime}</td>
                <td className="td">{s.breakMinutes} phút</td>
                <td className="td">{s._count.registrations}</td>
                <td className="td text-right">
                  <form action={deleteShift}>
                    <input type="hidden" name="id" value={s.id} />
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
