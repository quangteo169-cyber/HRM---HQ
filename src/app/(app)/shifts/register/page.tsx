import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { registerShift } from "@/actions/shifts";
import { FlashMessage, PageHeader, StatusBadge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export default async function ShiftRegisterPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  const user = await requireUser();
  const shifts = await prisma.shift.findMany({ orderBy: { code: "asc" } });

  const myRegistrations = user.employeeId
    ? await prisma.shiftRegistration.findMany({
        where: { employeeId: user.employeeId },
        include: { shift: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Đăng ký ca làm việc"
        subtitle="Chọn ca và khoảng thời gian áp dụng. Đăng ký cần được quản lý duyệt trước khi có hiệu lực tính công."
      />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      {!user.employeeId ? (
        <div className="card p-5 text-sm text-slate-500">
          Tài khoản của bạn chưa được gắn với hồ sơ nhân viên. Vui lòng liên hệ quản trị viên.
        </div>
      ) : (
        <form action={registerShift} className="card mb-5 grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="label">Ca làm việc *</label>
            <select name="shiftId" className="input" required>
              <option value="">— Chọn ca —</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Từ ngày *</label>
            <input type="date" name="startDate" className="input" required />
          </div>
          <div>
            <label className="label">Đến ngày *</label>
            <input type="date" name="endDate" className="input" required />
          </div>
          <div>
            <button type="submit" className="btn-primary w-full">
              Gửi đăng ký
            </button>
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <label className="label">Ghi chú</label>
            <input name="note" className="input" placeholder="Lý do / ghi chú thêm (không bắt buộc)" />
          </div>
        </form>
      )}

      <h2 className="mb-2 font-semibold text-slate-700">Đăng ký của tôi</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              <th className="th">Ca</th>
              <th className="th">Từ ngày</th>
              <th className="th">Đến ngày</th>
              <th className="th">Ghi chú</th>
              <th className="th">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {myRegistrations.length === 0 && (
              <tr>
                <td className="td text-center text-slate-400" colSpan={5}>
                  Chưa có đăng ký nào
                </td>
              </tr>
            )}
            {myRegistrations.map((r) => (
              <tr key={r.id}>
                <td className="td font-medium">{r.shift.name}</td>
                <td className="td">{fmtDate(r.startDate)}</td>
                <td className="td">{fmtDate(r.endDate)}</td>
                <td className="td">{r.note ?? "—"}</td>
                <td className="td">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
