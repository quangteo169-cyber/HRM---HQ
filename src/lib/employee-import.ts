import * as XLSX from "xlsx";
import { prisma } from "./prisma";

// ==================== Import danh sách nhân viên từ Excel/CSV ====================
// Nhận diện cột theo tiêu đề tiếng Việt (không phân biệt hoa thường, dấu, thứ tự cột).
// Nhân viên trùng Mã NV sẽ được CẬP NHẬT, mã mới sẽ được TẠO MỚI.
// Phòng ban chưa có sẽ tự động được tạo.

export type ImportResult = {
  created: number;
  updated: number;
  errors: string[]; // mô tả lỗi từng dòng bị bỏ qua
};

type ParsedEmployee = {
  code: string;
  fullName: string;
  dob: Date | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  address: string | null;
  joinDate: Date;
  departmentName: string | null;
  position: string | null;
  contractType: string | null;
  status: "PROBATION" | "ACTIVE" | "INACTIVE";
  baseSalary: number;
  allowance: number;
  bankAccount: string | null;
  bankName: string | null;
};

/** Bỏ dấu tiếng Việt + thường hóa để so khớp tiêu đề cột */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type Field = keyof ParsedEmployee | "departmentName";

/** Xác định cột nào ứng với trường nào dựa trên tiêu đề */
function matchHeader(h: string): Field | null {
  const n = normalize(h);
  if (!n) return null;
  if (n.includes("ma") && (n.includes("nv") || n.includes("nhan vien"))) return "code";
  if (n.includes("ho") && n.includes("ten")) return "fullName";
  if (n.includes("ngay sinh")) return "dob";
  if (n.includes("gioi tinh")) return "gender";
  if (n.includes("dien thoai") || n.includes("sdt")) return "phone";
  if (n.includes("email")) return "email";
  if (n.includes("cccd") || n.includes("cmnd") || n.includes("can cuoc")) return "nationalId";
  if (n.includes("dia chi")) return "address";
  if (n.includes("ngay vao") || n.includes("ngay nhan viec")) return "joinDate";
  if (n.includes("phong ban") || n.includes("bo phan")) return "departmentName";
  if (n.includes("chuc vu") || n.includes("chuc danh")) return "position";
  if (n.includes("hop dong")) return "contractType";
  if (n.includes("trang thai")) return "status";
  if (n.includes("phu cap")) return "allowance";
  if (n.includes("luong")) return "baseSalary";
  if (n.includes("tai khoan") || n === "stk" || n.includes("so tk")) return "bankAccount";
  if (n.includes("ngan hang")) return "bankName";
  return null;
}

function parseDateCell(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? new Date(Date.UTC(d.y, d.m - 1, d.d)) : null;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return null;
}

function parseMoneyCell(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Math.round(v);
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseStatusCell(v: unknown): "PROBATION" | "ACTIVE" | "INACTIVE" {
  const n = normalize(String(v ?? ""));
  if (n.includes("thu viec")) return "PROBATION";
  if (n.includes("nghi")) return "INACTIVE";
  return "ACTIVE";
}

function cellStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Đọc workbook -> danh sách nhân viên + lỗi từng dòng */
export function parseEmployeeWorkbook(buf: Buffer): {
  rows: ParsedEmployee[];
  errors: string[];
} {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], errors: ["File không có sheet dữ liệu nào"] };

  const table: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  // Tìm dòng tiêu đề: dòng đầu tiên khớp được cột Mã NV và Họ tên
  let headerIdx = -1;
  let fieldOfCol: (Field | null)[] = [];
  for (let i = 0; i < Math.min(table.length, 10); i++) {
    const mapped = (table[i] ?? []).map((c) => matchHeader(String(c ?? "")));
    if (mapped.includes("code") && mapped.includes("fullName")) {
      headerIdx = i;
      fieldOfCol = mapped;
      break;
    }
  }
  if (headerIdx === -1) {
    return {
      rows: [],
      errors: ['Không tìm thấy dòng tiêu đề có cột "Mã NV" và "Họ và tên". Hãy dùng file mẫu.'],
    };
  }

  const rows: ParsedEmployee[] = [];
  const errors: string[] = [];
  const seenCodes = new Set<string>();

  for (let i = headerIdx + 1; i < table.length; i++) {
    const raw = table[i] ?? [];
    if (raw.every((c) => c == null || String(c).trim() === "")) continue; // dòng trống

    const get = (f: Field): unknown => {
      const idx = fieldOfCol.indexOf(f);
      return idx === -1 ? null : raw[idx];
    };

    const code = cellStr(get("code"))?.toUpperCase() ?? null;
    const fullName = cellStr(get("fullName"));
    const lineNo = i + 1;
    if (!code || !fullName) {
      errors.push(`Dòng ${lineNo}: thiếu Mã NV hoặc Họ tên`);
      continue;
    }
    if (seenCodes.has(code)) {
      errors.push(`Dòng ${lineNo}: Mã NV ${code} bị lặp trong file (giữ dòng xuất hiện trước)`);
      continue;
    }
    seenCodes.add(code);

    rows.push({
      code,
      fullName,
      dob: parseDateCell(get("dob")),
      gender: cellStr(get("gender")),
      phone: cellStr(get("phone")),
      email: cellStr(get("email")),
      nationalId: cellStr(get("nationalId")),
      address: cellStr(get("address")),
      joinDate: parseDateCell(get("joinDate")) ?? new Date(),
      departmentName: cellStr(get("departmentName")),
      position: cellStr(get("position")),
      contractType: cellStr(get("contractType")),
      status: parseStatusCell(get("status")),
      baseSalary: parseMoneyCell(get("baseSalary")),
      allowance: parseMoneyCell(get("allowance")),
      bankAccount: cellStr(get("bankAccount")),
      bankName: cellStr(get("bankName")),
    });
  }

  return { rows, errors };
}

/** Ghi danh sách đã đọc vào database (tạo mới / cập nhật theo Mã NV) */
export async function importEmployees(buf: Buffer): Promise<ImportResult> {
  const { rows, errors } = parseEmployeeWorkbook(buf);
  if (rows.length === 0) return { created: 0, updated: 0, errors };

  // 1. Tự tạo phòng ban còn thiếu (so khớp không phân biệt hoa thường)
  const deptNames = Array.from(
    new Set(rows.map((r) => r.departmentName).filter((x): x is string => !!x))
  );
  const existingDepts = await prisma.department.findMany();
  const deptIdByNorm = new Map(existingDepts.map((d) => [normalize(d.name), d.id]));
  const missing = deptNames.filter((n) => !deptIdByNorm.has(normalize(n)));
  if (missing.length > 0) {
    await prisma.department.createMany({ data: missing.map((name) => ({ name })) });
    const refreshed = await prisma.department.findMany();
    deptIdByNorm.clear();
    for (const d of refreshed) deptIdByNorm.set(normalize(d.name), d.id);
  }

  // 2. Phân loại tạo mới / cập nhật theo Mã NV
  const codes = rows.map((r) => r.code);
  const existing = await prisma.employee.findMany({ where: { code: { in: codes } } });
  const existingCodes = new Set(existing.map((e) => e.code));

  const toData = (r: ParsedEmployee) => ({
    code: r.code,
    fullName: r.fullName,
    dob: r.dob,
    gender: r.gender,
    phone: r.phone,
    email: r.email,
    nationalId: r.nationalId,
    address: r.address,
    joinDate: r.joinDate,
    status: r.status,
    position: r.position,
    contractType: r.contractType,
    baseSalary: r.baseSalary,
    allowance: r.allowance,
    bankAccount: r.bankAccount,
    bankName: r.bankName,
    departmentId: r.departmentName ? (deptIdByNorm.get(normalize(r.departmentName)) ?? null) : null,
  });

  const toCreate = rows.filter((r) => !existingCodes.has(r.code));
  const toUpdate = rows.filter((r) => existingCodes.has(r.code));

  if (toCreate.length > 0) {
    await prisma.employee.createMany({ data: toCreate.map(toData) });
  }
  // Cập nhật theo lô 50 dòng/transaction
  for (let i = 0; i < toUpdate.length; i += 50) {
    const chunk = toUpdate.slice(i, i + 50);
    await prisma.$transaction(
      chunk.map((r) => prisma.employee.update({ where: { code: r.code }, data: toData(r) }))
    );
  }

  // 3. Tạo số dư phép năm hiện tại cho mọi nhân viên trong file
  const year = new Date().getUTCFullYear();
  const all = await prisma.employee.findMany({ where: { code: { in: codes } } });
  await prisma.leaveBalance.createMany({
    data: all.map((e) => ({ employeeId: e.id, year, entitled: 12, used: 0 })),
    skipDuplicates: true,
  });

  return { created: toCreate.length, updated: toUpdate.length, errors };
}

/** Tạo file Excel mẫu để tải về */
export function buildEmployeeTemplate(): Buffer {
  const headers = [
    "Mã NV", "Họ và tên", "Ngày sinh", "Giới tính", "Số điện thoại", "Email",
    "CCCD", "Địa chỉ", "Ngày vào làm", "Phòng ban", "Chức vụ", "Loại hợp đồng",
    "Trạng thái", "Lương cơ bản", "Phụ cấp", "Số tài khoản", "Ngân hàng",
  ];
  const examples = [
    ["HQ101", "Nguyễn Văn Mẫu", "15/03/1995", "Nam", "0901234567", "mau.nguyen@hqgroups.vn",
      "001095001234", "Số 1 Đại Cồ Việt, Hà Nội", "01/08/2026", "Kinh doanh", "Nhân viên kinh doanh",
      "Không xác định thời hạn", "Chính thức", 12000000, 1000000, "19001234567", "Techcombank"],
    ["HQ102", "Trần Thị Ví Dụ", "20/11/1998", "Nữ", "0912345678", "vidu.tran@hqgroups.vn",
      "001198005678", "Cầu Giấy, Hà Nội", "01/08/2026", "Kỹ thuật", "Kỹ sư phần mềm",
      "Xác định thời hạn", "Thử việc", 15000000, 500000, "19007654321", "Vietcombank"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Nhân viên");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
