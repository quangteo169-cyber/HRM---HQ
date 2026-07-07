import { prisma } from "./prisma";
import { daysInMonth, isWeekend, minutesFromHHMM } from "./utils";

// ==================== Import dữ liệu máy chấm công ====================
// Hỗ trợ file CSV/TXT xuất từ máy chấm công với mỗi dòng gồm:
//   <mã nhân viên> <ngày giờ chấm> [<mã thiết bị>]
// Ngăn cách bởi dấu phẩy, chấm phẩy hoặc tab.
// Định dạng ngày giờ hỗ trợ: "YYYY-MM-DD HH:mm[:ss]" hoặc "DD/MM/YYYY HH:mm[:ss]"

export type ParsedPunch = { employeeCode: string; timestamp: Date; device?: string };

function parseTimestamp(raw: string): Date | null {
  const s = raw.trim().replace(/\s+/g, " ");
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) {
    const [, y, mo, d, h, mi, se] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se || 0)));
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) {
    const [, d, mo, y, h, mi, se] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se || 0)));
  }
  return null;
}

export function parseAttendanceCsv(text: string): { punches: ParsedPunch[]; skipped: number } {
  const punches: ParsedPunch[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      skipped++;
      continue;
    }
    const ts = parseTimestamp(parts[1]);
    if (!ts || !parts[0]) {
      skipped++; // dòng tiêu đề hoặc dữ liệu lỗi
      continue;
    }
    punches.push({ employeeCode: parts[0], timestamp: ts, device: parts[2] });
  }
  return { punches, skipped };
}

// ==================== Tổng hợp công theo tháng ====================

const DEFAULT_SHIFT = { startTime: "08:00", endTime: "17:30", breakMinutes: 90 };
const LATE_GRACE_MINUTES = 5;
const OT_MIN_MINUTES = 30;

export async function processAttendanceMonth(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const totalDays = daysInMonth(year, month);

  const employees = await prisma.employee.findMany({
    where: { status: { not: "INACTIVE" } },
  });
  const byCode = new Map(employees.map((e) => [e.code, e]));

  const records = await prisma.attendanceRecord.findMany({
    where: { timestamp: { gte: start, lt: end } },
    orderBy: { timestamp: "asc" },
  });

  // Gom giờ chấm theo nhân viên + ngày
  const punchesByEmpDay = new Map<string, Date[]>();
  for (const r of records) {
    const emp = byCode.get(r.employeeCode);
    if (!emp) continue;
    const key = `${emp.id}|${r.timestamp.toISOString().slice(0, 10)}`;
    const list = punchesByEmpDay.get(key) ?? [];
    list.push(r.timestamp);
    punchesByEmpDay.set(key, list);
  }

  // Ca đã được duyệt trong tháng
  const registrations = await prisma.shiftRegistration.findMany({
    where: { status: "APPROVED", startDate: { lt: end }, endDate: { gte: start } },
    include: { shift: true },
    orderBy: { createdAt: "asc" },
  });

  // Nghỉ phép đã duyệt trong tháng
  const leaves = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED", startDate: { lt: end }, endDate: { gte: start } },
    include: { leaveType: true },
  });

  function shiftForDay(employeeId: string, date: Date) {
    // Đăng ký sau cùng có hiệu lực
    let found: { startTime: string; endTime: string; breakMinutes: number } | null = null;
    for (const reg of registrations) {
      if (
        reg.employeeId === employeeId &&
        reg.startDate.getTime() <= date.getTime() &&
        reg.endDate.getTime() >= date.getTime()
      ) {
        found = reg.shift;
      }
    }
    return found ?? DEFAULT_SHIFT;
  }

  function leaveForDay(employeeId: string, date: Date) {
    return leaves.find(
      (l) =>
        l.employeeId === employeeId &&
        l.startDate.getTime() <= date.getTime() &&
        l.endDate.getTime() >= date.getTime()
    );
  }

  // Tính toàn bộ trong bộ nhớ rồi ghi hàng loạt (2 truy vấn)
  // thay vì upsert từng dòng — cần thiết khi có hàng trăm nhân viên
  type DayRow = {
    employeeId: string;
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    workHours: number;
    otHours: number;
    lateMinutes: number;
    status: string;
    note: string | null;
  };
  const rows: DayRow[] = [];
  for (const emp of employees) {
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      const key = `${emp.id}|${date.toISOString().slice(0, 10)}`;
      const punches = punchesByEmpDay.get(key);

      let checkIn: Date | null = null;
      let checkOut: Date | null = null;
      let workHours = 0;
      let otHours = 0;
      let lateMinutes = 0;
      let status = "ABSENT";
      let note: string | null = null;

      if (punches && punches.length > 0) {
        checkIn = punches[0];
        checkOut = punches.length > 1 ? punches[punches.length - 1] : null;
        const shift = shiftForDay(emp.id, date);
        const shiftStart = minutesFromHHMM(shift.startTime);
        const shiftEnd = minutesFromHHMM(shift.endTime);
        const inMin = checkIn.getUTCHours() * 60 + checkIn.getUTCMinutes();

        if (checkOut) {
          const outMin = checkOut.getUTCHours() * 60 + checkOut.getUTCMinutes();
          const effIn = Math.max(inMin, shiftStart);
          const effOut = Math.min(outMin, shiftEnd);
          let span = Math.max(0, effOut - effIn);
          if (span >= 300) span -= shift.breakMinutes; // trừ giờ nghỉ trưa nếu làm >= 5h
          workHours = Math.round((span / 60) * 100) / 100;

          if (outMin - shiftEnd >= OT_MIN_MINUTES) {
            otHours = Math.floor(((outMin - shiftEnd) / 60) * 2) / 2; // làm tròn xuống 0.5h
          }
        } else {
          note = "Thiếu giờ ra";
        }

        lateMinutes = Math.max(0, inMin - shiftStart - LATE_GRACE_MINUTES);
        status = "PRESENT";
      } else {
        const leave = leaveForDay(emp.id, date);
        if (leave && !isWeekend(date)) {
          status = "LEAVE";
          note = leave.leaveType.name;
        } else if (isWeekend(date)) {
          status = "WEEKEND";
        }
      }

      rows.push({ employeeId: emp.id, date, checkIn, checkOut, workHours, otHours, lateMinutes, status, note });
    }
  }

  await prisma.$transaction([
    prisma.attendanceDay.deleteMany({ where: { date: { gte: start, lt: end } } }),
    prisma.attendanceDay.createMany({ data: rows }),
  ]);
  return rows.length;
}
