import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { generatePayroll, finalizePayroll } from "@/actions/payroll";
import { FlashMessage, PageHeader, StatusBadge } from "@/components/ui";
import { fmtMoney } from "@/lib/utils";

export default async function PayrollDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { message?: string; error?: string };
}) {
  await requireUser(CAN_MANAGE_HR);
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: params.id },
    include: {
      payslips: {
        include: { employee: { include: { department: true } } },
        orderBy: { employee: { code: "asc" } },
      },
    },
  });
  if (!period) notFound();

  const totalNet = period.payslips.reduce((s, p) => s + p.netPay, 0);
  const isDraft = period.status === "DRAFT";

  return (
    <div>
      <PageHeader
        title={`Bảng lương tháng ${period.month}/${period.year}`}
        subtitle={`Ngày công chuẩn: ${period.standardDays} — Tổng thực chi: ${fmtMoney(totalNet)} đ`}
      >
        <StatusBadge status={period.status} />
        <Link href="/payroll" className="btn-secondary">
          ← Quay lại
        </Link>
        {isDraft && (
          <>
            <form action={generatePayroll}>
              <input type="hidden" name="periodId" value={period.id} />
              <button type="submit" className="btn-primary">
                ⚙️ {period.payslips.length > 0 ? "Tính lại lương" : "Tính lương"}
              </button>
            </form>
            {period.payslips.length > 0 && (
              <form action={finalizePayroll}>
                <input type="hidden" name="periodId" value={period.id} />
                <button type="submit" className="btn-success">
                  🔒 Chốt kỳ lương
                </button>
              </form>
            )}
          </>
        )}
      </PageHeader>

      <FlashMessage message={searchParams.message} error={searchParams.error} />

      {isDraft && (
        <p className="mb-4 text-sm text-slate-500">
          Lương được tính từ <b>bảng chấm công đã tổng hợp</b> và <b>đơn nghỉ phép hưởng lương đã duyệt</b>.
          Hãy đảm bảo đã tổng hợp công tháng {period.month}/{period.year} trước khi tính.
          Sau khi <b>chốt</b>, nhân viên sẽ xem được phiếu lương và không thể tính lại.
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr>
              <th className="th">Mã NV</th>
              <th className="th">Họ tên</th>
              <th className="th">Phòng ban</th>
              <th className="th text-right">Công</th>
              <th className="th text-right">Phép</th>
              <th className="th text-right">OT (h)</th>
              <th className="th text-right">Lương CB</th>
              <th className="th text-right">Lương theo công</th>
              <th className="th text-right">Tiền OT</th>
              <th className="th text-right">Tổng thu nhập</th>
              <th className="th text-right">Bảo hiểm</th>
              <th className="th text-right">Thuế TNCN</th>
              <th className="th text-right">Thực lãnh</th>
            </tr>
          </thead>
          <tbody>
            {period.payslips.length === 0 && (
              <tr>
                <td className="td text-center text-slate-400" colSpan={13}>
                  Chưa tính lương — bấm &quot;Tính lương&quot; để tạo phiếu lương từ bảng công
                </td>
              </tr>
            )}
            {period.payslips.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td font-mono">{p.employee.code}</td>
                <td className="td font-medium">{p.employee.fullName}</td>
                <td className="td">{p.employee.department?.name ?? "—"}</td>
                <td className="td text-right">{p.workDays}</td>
                <td className="td text-right">{p.paidLeaveDays}</td>
                <td className="td text-right">{p.otHours}</td>
                <td className="td text-right">{fmtMoney(p.baseSalary)}</td>
                <td className="td text-right">{fmtMoney(p.salaryByDays)}</td>
                <td className="td text-right">{fmtMoney(p.otPay)}</td>
                <td className="td text-right font-medium">{fmtMoney(p.grossPay)}</td>
                <td className="td text-right text-red-500">-{fmtMoney(p.insuranceDeduction)}</td>
                <td className="td text-right text-red-500">-{fmtMoney(p.taxDeduction)}</td>
                <td className="td text-right font-bold text-emerald-600">{fmtMoney(p.netPay)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Công thức: Lương theo công = Lương CB / công chuẩn × (công + phép hưởng lương). OT ×1.5 lương giờ.
        Bảo hiểm NLĐ đóng 10.5% lương CB. Thuế TNCN lũy tiến sau giảm trừ bản thân 11 triệu đồng.
        Đơn vị: VNĐ.
      </p>
    </div>
  );
}
