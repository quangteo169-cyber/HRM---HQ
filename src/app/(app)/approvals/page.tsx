import { prisma } from "@/lib/prisma";
import { requireUser, CAN_APPROVE } from "@/lib/auth";
import { reviewLeaveRequest } from "@/actions/leaves";
import { reviewShiftRegistration } from "@/actions/shifts";
import { FlashMessage, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  const user = await requireUser(CAN_APPROVE);

  // Quản lý chỉ duyệt đơn của nhân viên trong phòng mình
  const managerFilter =
    user.role === "MANAGER"
      ? { employee: { department: { managerId: user.employeeId ?? "___" } } }
      : {};

  const [pendingLeaves, pendingShifts] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: "PENDING", ...managerFilter },
      include: { employee: { include: { department: true } }, leaveType: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.shiftRegistration.findMany({
      where: { status: "PENDING", ...managerFilter },
      include: { employee: { include: { department: true } }, shift: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Duyệt đơn"
        subtitle={
          user.role === "MANAGER"
            ? "Các đơn chờ duyệt của nhân viên trong phòng bạn quản lý"
            : "Tất cả các đơn đang chờ duyệt trong công ty"
        }
      />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      <h2 className="mb-2 font-semibold text-slate-700">
        🌴 Đơn nghỉ phép chờ duyệt ({pendingLeaves.length})
      </h2>
      <div className="card mb-6 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr>
              <th className="th">Nhân viên</th>
              <th className="th">Phòng ban</th>
              <th className="th">Loại phép</th>
              <th className="th">Thời gian</th>
              <th className="th">Số ngày</th>
              <th className="th">Lý do</th>
              <th className="th text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pendingLeaves.length === 0 && (
              <tr>
                <td className="td text-center text-slate-400" colSpan={7}>
                  Không có đơn nào chờ duyệt 🎉
                </td>
              </tr>
            )}
            {pendingLeaves.map((r) => (
              <tr key={r.id}>
                <td className="td font-medium">{r.employee.fullName}</td>
                <td className="td">{r.employee.department?.name ?? "—"}</td>
                <td className="td">{r.leaveType.name}</td>
                <td className="td">
                  {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                </td>
                <td className="td">{r.days}</td>
                <td className="td max-w-[180px] truncate">{r.reason ?? "—"}</td>
                <td className="td">
                  <div className="flex justify-end gap-2">
                    <form action={reviewLeaveRequest}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button type="submit" className="btn-success">
                        ✓ Duyệt
                      </button>
                    </form>
                    <form action={reviewLeaveRequest}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button type="submit" className="btn-danger">
                        ✕ Từ chối
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 font-semibold text-slate-700">
        🕐 Đăng ký ca chờ duyệt ({pendingShifts.length})
      </h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="th">Nhân viên</th>
              <th className="th">Phòng ban</th>
              <th className="th">Ca đăng ký</th>
              <th className="th">Thời gian áp dụng</th>
              <th className="th">Ghi chú</th>
              <th className="th text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pendingShifts.length === 0 && (
              <tr>
                <td className="td text-center text-slate-400" colSpan={6}>
                  Không có đăng ký nào chờ duyệt 🎉
                </td>
              </tr>
            )}
            {pendingShifts.map((r) => (
              <tr key={r.id}>
                <td className="td font-medium">{r.employee.fullName}</td>
                <td className="td">{r.employee.department?.name ?? "—"}</td>
                <td className="td">{r.shift.name}</td>
                <td className="td">
                  {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                </td>
                <td className="td max-w-[180px] truncate">{r.note ?? "—"}</td>
                <td className="td">
                  <div className="flex justify-end gap-2">
                    <form action={reviewShiftRegistration}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button type="submit" className="btn-success">
                        ✓ Duyệt
                      </button>
                    </form>
                    <form action={reviewShiftRegistration}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button type="submit" className="btn-danger">
                        ✕ Từ chối
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
