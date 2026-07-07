"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { calcPayslip } from "@/lib/payroll";
import { businessDaysBetween } from "@/lib/utils";

export async function createPayrollPeriod(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const month = Number(fd.get("month"));
  const year = Number(fd.get("year"));
  const standardDays = Number(fd.get("standardDays") ?? 26);
  if (!month || !year || month < 1 || month > 12) {
    redirect("/payroll?error=" + encodeURIComponent("Tháng/năm không hợp lệ"));
  }
  const existed = await prisma.payrollPeriod.findUnique({
    where: { month_year: { month, year } },
  });
  if (existed) redirect("/payroll?error=" + encodeURIComponent(`Kỳ lương ${month}/${year} đã tồn tại`));
  await prisma.payrollPeriod.create({ data: { month, year, standardDays } });
  revalidatePath("/payroll");
  redirect("/payroll?message=" + encodeURIComponent(`Đã tạo kỳ lương ${month}/${year}`));
}

export async function generatePayroll(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const periodId = String(fd.get("periodId") ?? "");
  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) redirect("/payroll");
  if (period!.status === "FINALIZED") {
    redirect(`/payroll/${periodId}?error=` + encodeURIComponent("Kỳ lương đã chốt, không thể tính lại"));
  }

  const { month, year, standardDays } = period!;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // ngày cuối tháng
  const endExclusive = new Date(Date.UTC(year, month, 1));

  // Lấy toàn bộ dữ liệu tháng trong 3 truy vấn rồi tính trong bộ nhớ —
  // tránh hàng trăm truy vấn tuần tự khi công ty có nhiều nhân viên
  const [employees, allDays, allPaidLeaves] = await Promise.all([
    prisma.employee.findMany({ where: { status: { not: "INACTIVE" } } }),
    prisma.attendanceDay.findMany({ where: { date: { gte: start, lt: endExclusive } } }),
    prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        leaveType: { paid: true },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    }),
  ]);

  const daysByEmp = new Map<string, typeof allDays>();
  for (const d of allDays) {
    const list = daysByEmp.get(d.employeeId) ?? [];
    list.push(d);
    daysByEmp.set(d.employeeId, list);
  }
  const leavesByEmp = new Map<string, typeof allPaidLeaves>();
  for (const l of allPaidLeaves) {
    const list = leavesByEmp.get(l.employeeId) ?? [];
    list.push(l);
    leavesByEmp.set(l.employeeId, list);
  }

  const slips = employees.map((emp) => {
    let workDays = 0;
    let otHours = 0;
    for (const d of daysByEmp.get(emp.id) ?? []) {
      if (d.status === "PRESENT") {
        // quy đổi giờ làm thành công (làm tròn 0.5, tối đa 1 công/ngày)
        workDays += Math.min(1, Math.round((d.workHours / 8) * 2) / 2);
      }
      otHours += d.otHours;
    }

    let paidLeaveDays = 0;
    for (const l of leavesByEmp.get(emp.id) ?? []) {
      const s = l.startDate.getTime() > start.getTime() ? l.startDate : start;
      const e = l.endDate.getTime() < end.getTime() ? l.endDate : end;
      paidLeaveDays += businessDaysBetween(s, e);
    }

    const calc = calcPayslip({
      baseSalary: emp.baseSalary,
      allowance: emp.allowance,
      standardDays,
      workDays,
      paidLeaveDays,
      otHours,
    });

    return {
      periodId,
      employeeId: emp.id,
      workDays,
      paidLeaveDays,
      otHours,
      baseSalary: emp.baseSalary,
      allowance: emp.allowance,
      ...calc,
    };
  });

  await prisma.$transaction([
    prisma.payslip.deleteMany({ where: { periodId } }),
    prisma.payslip.createMany({ data: slips }),
  ]);

  revalidatePath(`/payroll/${periodId}`);
  redirect(`/payroll/${periodId}?message=` + encodeURIComponent("Đã tính lương cho " + employees.length + " nhân viên"));
}

export async function finalizePayroll(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const periodId = String(fd.get("periodId") ?? "");
  await prisma.payrollPeriod.update({ where: { id: periodId }, data: { status: "FINALIZED" } });
  revalidatePath(`/payroll/${periodId}`);
  redirect(`/payroll/${periodId}?message=` + encodeURIComponent("Đã chốt kỳ lương"));
}

export async function deletePayrollPeriod(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const periodId = String(fd.get("periodId") ?? "");
  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (period?.status === "FINALIZED") {
    redirect("/payroll?error=" + encodeURIComponent("Không thể xóa kỳ lương đã chốt"));
  }
  await prisma.payrollPeriod.delete({ where: { id: periodId } });
  revalidatePath("/payroll");
  redirect("/payroll?message=" + encodeURIComponent("Đã xóa kỳ lương"));
}
