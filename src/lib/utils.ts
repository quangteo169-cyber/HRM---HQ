// Tiện ích định dạng & xử lý ngày giờ.
// Quy ước: mọi mốc "ngày" và "giờ chấm công" được lưu theo giờ tường (wall clock)
// dưới dạng UTC để không phụ thuộc múi giờ của server.

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

export function fmtDate(d?: Date | null): string {
  if (!d) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export function fmtTime(d?: Date | null): string {
  if (!d) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

/** "2026-07-06" -> Date tại 00:00 UTC */
export function toDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function toInputDate(d?: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** Số ngày làm việc (bỏ T7, CN) trong khoảng [start, end], tính cả 2 đầu */
export function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    if (!isWeekend(cur)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

/** "08:30" -> 510 (phút kể từ 0h) */
export function minutesFromHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị hệ thống",
  HR: "Nhân sự (HR)",
  MANAGER: "Quản lý",
  EMPLOYEE: "Nhân viên",
};

export const STATUS_LABELS: Record<string, string> = {
  PROBATION: "Thử việc",
  ACTIVE: "Chính thức",
  INACTIVE: "Đã nghỉ việc",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  DRAFT: "Bản nháp",
  FINALIZED: "Đã chốt",
  PRESENT: "Đi làm",
  ABSENT: "Vắng",
  LEAVE: "Nghỉ phép",
  WEEKEND: "Cuối tuần",
};
