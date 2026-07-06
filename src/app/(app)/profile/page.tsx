import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/ui";
import { fmtDate, fmtMoney, ROLE_LABELS } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await requireUser();
  const year = new Date().getUTCFullYear();

  const employee = user.employeeId
    ? await prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: { department: true },
      })
    : null;

  const balance = user.employeeId
    ? await prisma.leaveBalance.findUnique({
        where: { employeeId_year: { employeeId: user.employeeId, year } },
      })
    : null;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Hồ sơ của tôi" subtitle={user.email ?? ""} />

      <div className="card mb-4 p-5">
        <h2 className="mb-3 font-semibold text-slate-700">Tài khoản</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Email đăng nhập</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Quyền hạn</dt>
            <dd className="font-medium">{ROLE_LABELS[user.role] ?? user.role}</dd>
          </div>
        </dl>
      </div>

      {!employee ? (
        <div className="card p-5 text-sm text-slate-500">
          Tài khoản chưa được gắn với hồ sơ nhân viên. Liên hệ phòng Nhân sự để cập nhật.
        </div>
      ) : (
        <>
          <div className="card mb-4 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">Thông tin nhân sự</h2>
              <StatusBadge status={employee.status} />
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-slate-400">Mã nhân viên</dt>
                <dd className="font-mono font-medium">{employee.code}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Họ tên</dt>
                <dd className="font-medium">{employee.fullName}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Phòng ban</dt>
                <dd className="font-medium">{employee.department?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Chức vụ</dt>
                <dd className="font-medium">{employee.position ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Ngày vào làm</dt>
                <dd className="font-medium">{fmtDate(employee.joinDate)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Loại hợp đồng</dt>
                <dd className="font-medium">{employee.contractType ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Điện thoại</dt>
                <dd className="font-medium">{employee.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Lương cơ bản</dt>
                <dd className="font-medium">{fmtMoney(employee.baseSalary)} đ</dd>
              </div>
              <div>
                <dt className="text-slate-400">Phụ cấp</dt>
                <dd className="font-medium">{fmtMoney(employee.allowance)} đ</dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-700">Phép năm {year}</h2>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-slate-400">Được hưởng: </span>
                <b>{balance?.entitled ?? 12} ngày</b>
              </div>
              <div>
                <span className="text-slate-400">Đã dùng: </span>
                <b className="text-amber-600">{balance?.used ?? 0} ngày</b>
              </div>
              <div>
                <span className="text-slate-400">Còn lại: </span>
                <b className="text-emerald-600">
                  {(balance?.entitled ?? 12) - (balance?.used ?? 0)} ngày
                </b>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
