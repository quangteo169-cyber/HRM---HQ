import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { createLeaveRequest, cancelLeaveRequest } from "@/actions/leaves";
import { FlashMessage, PageHeader, StatusBadge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export default async function LeavesPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  const user = await requireUser();
  const year = new Date().getUTCFullYear();
  const isHR = CAN_MANAGE_HR.includes(user.role);

  const leaveTypes = await prisma.leaveType.findMany({ orderBy: { code: "asc" } });

  // Số dư phép của tôi
  const myBalance = user.employeeId
    ? await prisma.leaveBalance.findUnique({
        where: { employeeId_year: { employeeId: user.employeeId, year } },
      })
    : null;

  // Danh sách đơn: HR/Admin xem tất cả, Quản lý xem phòng mình + của mình, nhân viên xem của mình
  let requestFilter: any = { employeeId: user.employeeId ?? "___" };
  if (isHR) {
    requestFilter = {};
  } else if (user.role === "MANAGER") {
    requestFilter = {
      OR: [
        { employeeId: user.employeeId ?? "___" },
        { employee: { department: { managerId: user.employeeId ?? "___" } } },
      ],
    };
  }

  const requests = await prisma.leaveRequest.findMany({
    where: requestFilter,
    include: { employee: true, leaveType: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const remaining = myBalance ? myBalance.entitled - myBalance.used : null;

  return (
    <div className="max-w-5xl">
      <PageHeader title="Nghỉ phép" subtitle="Tạo đơn xin nghỉ và theo dõi trạng thái duyệt" />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      {user.employeeId && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <div className="text-xs text-slate-500">Phép năm {year} được hưởng</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{myBalance?.entitled ?? 12} ngày</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">Đã sử dụng</div>
            <div className="mt-1 text-2xl font-bold text-amber-600">{myBalance?.used ?? 0} ngày</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">Còn lại</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600">
              {remaining ?? 12} ngày
            </div>
          </div>
        </div>
      )}

      {user.employeeId && (
        <form action={createLeaveRequest} className="card mb-5 grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="label">Loại nghỉ phép *</label>
            <select name="leaveTypeId" className="input" required>
              <option value="">— Chọn loại phép —</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.paid ? "(hưởng lương)" : "(không lương)"}
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
              Gửi đơn
            </button>
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <label className="label">Lý do</label>
            <input name="reason" className="input" placeholder="Lý do xin nghỉ..." />
          </div>
          <p className="text-xs text-slate-400 sm:col-span-2 lg:col-span-5">
            Số ngày nghỉ được tính theo ngày làm việc (không tính Thứ 7, Chủ nhật).
          </p>
        </form>
      )}

      <h2 className="mb-2 font-semibold text-slate-700">
        {isHR ? "Tất cả đơn nghỉ phép" : user.role === "MANAGER" ? "Đơn của tôi & phòng tôi quản lý" : "Đơn của tôi"}
      </h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="th">Nhân viên</th>
              <th className="th">Loại phép</th>
              <th className="th">Từ ngày</th>
              <th className="th">Đến ngày</th>
              <th className="th">Số ngày</th>
              <th className="th">Lý do</th>
              <th className="th">Trạng thái</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td className="td text-center text-slate-400" colSpan={8}>
                  Chưa có đơn nào
                </td>
              </tr>
            )}
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="td font-medium">{r.employee.fullName}</td>
                <td className="td">{r.leaveType.name}</td>
                <td className="td">{fmtDate(r.startDate)}</td>
                <td className="td">{fmtDate(r.endDate)}</td>
                <td className="td">{r.days}</td>
                <td className="td max-w-[200px] truncate">{r.reason ?? "—"}</td>
                <td className="td">
                  <StatusBadge status={r.status} />
                </td>
                <td className="td text-right">
                  {r.status === "PENDING" && r.employeeId === user.employeeId && (
                    <form action={cancelLeaveRequest}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="btn-danger">
                        Hủy
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
