import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { createPayrollPeriod, deletePayrollPeriod } from "@/actions/payroll";
import { FlashMessage, PageHeader, StatusBadge } from "@/components/ui";
import { fmtMoney, MONTH_NAMES } from "@/lib/utils";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  const user = await requireUser();
  const isHR = CAN_MANAGE_HR.includes(user.role);
  const now = new Date();

  if (!isHR) {
    // Nhân viên / quản lý: xem phiếu lương của chính mình
    const payslips = user.employeeId
      ? await prisma.payslip.findMany({
          where: { employeeId: user.employeeId, period: { status: "FINALIZED" } },
          include: { period: true },
          orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
        })
      : [];

    return (
      <div className="max-w-4xl">
        <PageHeader title="Phiếu lương của tôi" subtitle="Chỉ hiển thị các kỳ lương đã chốt" />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="th">Kỳ lương</th>
                <th className="th text-right">Ngày công</th>
                <th className="th text-right">OT (giờ)</th>
                <th className="th text-right">Tổng thu nhập</th>
                <th className="th text-right">Bảo hiểm</th>
                <th className="th text-right">Thuế TNCN</th>
                <th className="th text-right">Thực lãnh</th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 && (
                <tr>
                  <td className="td text-center text-slate-400" colSpan={7}>
                    Chưa có phiếu lương nào được chốt
                  </td>
                </tr>
              )}
              {payslips.map((p) => (
                <tr key={p.id}>
                  <td className="td font-medium">
                    Tháng {p.period.month}/{p.period.year}
                  </td>
                  <td className="td text-right">{p.workDays + p.paidLeaveDays}</td>
                  <td className="td text-right">{p.otHours}</td>
                  <td className="td text-right">{fmtMoney(p.grossPay)} đ</td>
                  <td className="td text-right text-red-500">-{fmtMoney(p.insuranceDeduction)} đ</td>
                  <td className="td text-right text-red-500">-{fmtMoney(p.taxDeduction)} đ</td>
                  <td className="td text-right font-bold text-emerald-600">{fmtMoney(p.netPay)} đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const periods = await prisma.payrollPeriod.findMany({
    include: { _count: { select: { payslips: true } }, payslips: { select: { netPay: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Bảng lương"
        subtitle="Tạo kỳ lương theo tháng, tính lương từ bảng công và chốt để phát hành phiếu lương"
      />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      <form action={createPayrollPeriod} className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Tháng</label>
          <select name="month" className="input" defaultValue={now.getUTCMonth() + 1}>
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Năm</label>
          <input type="number" name="year" className="input w-28" defaultValue={now.getUTCFullYear()} min={2020} max={2100} />
        </div>
        <div>
          <label className="label">Ngày công chuẩn</label>
          <input type="number" name="standardDays" className="input w-32" defaultValue={26} step="0.5" min={1} max={31} />
        </div>
        <button type="submit" className="btn-primary">
          ➕ Tạo kỳ lương
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="th">Kỳ lương</th>
              <th className="th">Ngày công chuẩn</th>
              <th className="th">Số phiếu lương</th>
              <th className="th text-right">Tổng chi lương</th>
              <th className="th">Trạng thái</th>
              <th className="th text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 && (
              <tr>
                <td className="td text-center text-slate-400" colSpan={6}>
                  Chưa có kỳ lương nào
                </td>
              </tr>
            )}
            {periods.map((p) => {
              const total = p.payslips.reduce((s, x) => s + x.netPay, 0);
              return (
                <tr key={p.id}>
                  <td className="td font-medium">
                    <Link href={`/payroll/${p.id}`} className="text-blue-600 hover:underline">
                      Tháng {p.month}/{p.year}
                    </Link>
                  </td>
                  <td className="td">{p.standardDays}</td>
                  <td className="td">{p._count.payslips}</td>
                  <td className="td text-right">{total > 0 ? `${fmtMoney(total)} đ` : "—"}</td>
                  <td className="td">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      <Link href={`/payroll/${p.id}`} className="btn-secondary">
                        Chi tiết
                      </Link>
                      {p.status === "DRAFT" && (
                        <form action={deletePayrollPeriod}>
                          <input type="hidden" name="periodId" value={p.id} />
                          <button type="submit" className="btn-danger">
                            Xóa
                          </button>
                        </form>
                      )}
                    </div>
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
