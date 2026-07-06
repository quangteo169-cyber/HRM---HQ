import type { Department, Employee } from "@prisma/client";
import { toInputDate } from "@/lib/utils";

export default function EmployeeForm({
  employee,
  departments,
  action,
  readOnly = false,
}: {
  employee?: Employee | null;
  departments: Department[];
  action: (fd: FormData) => Promise<void>;
  readOnly?: boolean;
}) {
  const e = employee;
  const dis = readOnly;

  return (
    <form action={action} className="space-y-5">
      {e && <input type="hidden" name="id" value={e.id} />}

      <div className="card p-5">
        <h2 className="mb-4 font-semibold text-slate-700">Thông tin cơ bản</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">Mã nhân viên * (trùng mã máy chấm công)</label>
            <input name="code" className="input" defaultValue={e?.code} required disabled={dis} />
          </div>
          <div>
            <label className="label">Họ và tên *</label>
            <input name="fullName" className="input" defaultValue={e?.fullName} required disabled={dis} />
          </div>
          <div>
            <label className="label">Ngày sinh</label>
            <input type="date" name="dob" className="input" defaultValue={toInputDate(e?.dob)} disabled={dis} />
          </div>
          <div>
            <label className="label">Giới tính</label>
            <select name="gender" className="input" defaultValue={e?.gender ?? ""} disabled={dis}>
              <option value="">— Chọn —</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div>
            <label className="label">Số điện thoại</label>
            <input name="phone" className="input" defaultValue={e?.phone ?? ""} disabled={dis} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" name="email" className="input" defaultValue={e?.email ?? ""} disabled={dis} />
          </div>
          <div>
            <label className="label">CCCD/CMND</label>
            <input name="nationalId" className="input" defaultValue={e?.nationalId ?? ""} disabled={dis} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Địa chỉ</label>
            <input name="address" className="input" defaultValue={e?.address ?? ""} disabled={dis} />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold text-slate-700">Công việc & hợp đồng</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">Phòng ban</label>
            <select name="departmentId" className="input" defaultValue={e?.departmentId ?? ""} disabled={dis}>
              <option value="">— Chưa phân bổ —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Chức vụ</label>
            <input name="position" className="input" defaultValue={e?.position ?? ""} disabled={dis} />
          </div>
          <div>
            <label className="label">Ngày vào làm *</label>
            <input
              type="date"
              name="joinDate"
              className="input"
              defaultValue={toInputDate(e?.joinDate) || toInputDate(new Date())}
              required
              disabled={dis}
            />
          </div>
          <div>
            <label className="label">Loại hợp đồng</label>
            <select name="contractType" className="input" defaultValue={e?.contractType ?? ""} disabled={dis}>
              <option value="">— Chọn —</option>
              <option value="Thử việc">Thử việc</option>
              <option value="Xác định thời hạn">Xác định thời hạn</option>
              <option value="Không xác định thời hạn">Không xác định thời hạn</option>
              <option value="Thời vụ">Thời vụ</option>
            </select>
          </div>
          <div>
            <label className="label">Trạng thái</label>
            <select name="status" className="input" defaultValue={e?.status ?? "ACTIVE"} disabled={dis}>
              <option value="PROBATION">Thử việc</option>
              <option value="ACTIVE">Chính thức</option>
              <option value="INACTIVE">Đã nghỉ việc</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold text-slate-700">Lương & tài khoản ngân hàng</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Lương cơ bản (VNĐ/tháng)</label>
            <input type="number" name="baseSalary" className="input" defaultValue={e?.baseSalary ?? 0} min={0} disabled={dis} />
          </div>
          <div>
            <label className="label">Phụ cấp (VNĐ/tháng)</label>
            <input type="number" name="allowance" className="input" defaultValue={e?.allowance ?? 0} min={0} disabled={dis} />
          </div>
          <div>
            <label className="label">Số tài khoản</label>
            <input name="bankAccount" className="input" defaultValue={e?.bankAccount ?? ""} disabled={dis} />
          </div>
          <div>
            <label className="label">Ngân hàng</label>
            <input name="bankName" className="input" defaultValue={e?.bankName ?? ""} disabled={dis} />
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <button type="submit" className="btn-primary">
            {e ? "Lưu thay đổi" : "Thêm nhân viên"}
          </button>
        </div>
      )}
    </form>
  );
}
