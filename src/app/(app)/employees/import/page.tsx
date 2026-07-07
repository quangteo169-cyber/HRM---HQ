import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { importEmployeesFile } from "@/actions/employees";
import { FlashMessage, PageHeader } from "@/components/ui";

export default async function EmployeeImportPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  await requireUser(CAN_MANAGE_HR);
  const total = await prisma.employee.count();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Import danh sách nhân viên"
        subtitle={`Hiện có ${total} nhân viên trong hệ thống`}
      />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      <div className="card mb-5 p-6">
        <h2 className="mb-2 font-bold text-slate-800">Bước 1 — Chuẩn bị file Excel</h2>
        <p className="mb-4 text-sm text-slate-500">
          Tải file mẫu, điền danh sách nhân viên (mỗi dòng 1 người) rồi lưu lại. Chỉ 2 cột{" "}
          <b>Mã NV</b> và <b>Họ và tên</b> là bắt buộc, các cột khác có thể bỏ trống. Thứ tự cột
          không quan trọng — hệ thống tự nhận diện theo tiêu đề.
        </p>
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-slate-500">
          <li><b>Mã NV</b> phải trùng với mã trên máy chấm công</li>
          <li>Ngày tháng theo dạng <code className="rounded bg-slate-100 px-1">15/03/1995</code> hoặc để định dạng Date của Excel</li>
          <li><b>Phòng ban</b> chưa có sẽ được tự động tạo mới</li>
          <li><b>Trạng thái</b>: Chính thức / Thử việc / Nghỉ việc (bỏ trống = Chính thức)</li>
          <li>Nhân viên <b>trùng Mã NV</b> với dữ liệu đã có sẽ được <b>cập nhật</b>, không tạo trùng</li>
        </ul>
        <a href="/api/employees/template" className="btn-secondary">
          📄 Tải file mẫu (.xlsx)
        </a>
      </div>

      <div className="card p-6">
        <h2 className="mb-2 font-bold text-slate-800">Bước 2 — Tải file lên</h2>
        <p className="mb-4 text-sm text-slate-500">
          Hỗ trợ file <b>.xlsx</b>, <b>.xls</b> hoặc <b>.csv</b>. Với 150 nhân viên, quá trình nhập
          chỉ mất vài giây.
        </p>
        <form action={importEmployeesFile} className="flex items-center gap-3">
          <input type="file" name="file" accept=".xlsx,.xls,.csv" className="input" required />
          <button type="submit" className="btn-primary shrink-0">
            📥 Nhập danh sách
          </button>
        </form>
      </div>
    </div>
  );
}
