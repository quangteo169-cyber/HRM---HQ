import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { importAttendanceFile, processMonthAction } from "@/actions/attendance";
import { FlashMessage, PageHeader } from "@/components/ui";
import { MONTH_NAMES } from "@/lib/utils";

export default async function AttendanceImportPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  await requireUser(CAN_MANAGE_HR);
  const now = new Date();
  const totalRecords = await prisma.attendanceRecord.count();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Nhập dữ liệu máy chấm công"
        subtitle={`Đã lưu ${totalRecords.toLocaleString("vi-VN")} lượt chấm công trong hệ thống`}
      />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      <div className="card mb-5 p-5">
        <h2 className="mb-2 font-semibold text-slate-700">Bước 1 — Tải file từ máy chấm công</h2>
        <p className="mb-4 text-sm text-slate-500">
          Xuất dữ liệu từ máy chấm công (hoặc phần mềm đi kèm) ra file <b>CSV/TXT</b>, mỗi dòng
          gồm: <code className="rounded bg-slate-100 px-1">mã nhân viên, ngày giờ chấm, mã máy (tùy chọn)</code>.
          <br />
          Định dạng ngày giờ hỗ trợ: <code className="rounded bg-slate-100 px-1">2026-07-01 08:02:00</code> hoặc{" "}
          <code className="rounded bg-slate-100 px-1">01/07/2026 08:02</code>. Dữ liệu trùng sẽ tự động bỏ qua.
        </p>
        <pre className="mb-4 rounded-lg bg-slate-800 p-3 text-xs text-slate-100">
{`HQ001,2026-07-01 07:58:12,MAY01
HQ001,2026-07-01 17:35:40,MAY01
HQ003,01/07/2026 08:05,MAY02`}
        </pre>
        <form action={importAttendanceFile} className="flex items-center gap-3">
          <input type="file" name="file" accept=".csv,.txt" className="input" required />
          <button type="submit" className="btn-primary shrink-0">
            📥 Nhập dữ liệu
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-semibold text-slate-700">Bước 2 — Tổng hợp bảng công tháng</h2>
        <p className="mb-4 text-sm text-slate-500">
          Sau khi nhập dữ liệu, chạy tổng hợp để tính giờ công, đi muộn, tăng ca theo ca làm việc
          đã duyệt và cập nhật ngày nghỉ phép vào bảng công.
        </p>
        <form action={processMonthAction} className="flex items-end gap-3">
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
            <input
              type="number"
              name="year"
              className="input w-28"
              defaultValue={now.getUTCFullYear()}
              min={2020}
              max={2100}
            />
          </div>
          <button type="submit" className="btn-success">
            ⚙️ Tổng hợp công
          </button>
        </form>
      </div>
    </div>
  );
}
