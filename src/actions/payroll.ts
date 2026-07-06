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

  const employees = await prisma.employee.findMany({ where: { status: { not: "INACTIVE" } } });

  for (const emp of employees) {
    // Ngày công thực tế từ bảng công
    const days = await prisma.attendanceDay.findMany({
      where: { employeeId: emp.id, date: { gte: start, lt: endExclusive } },
    });
    let workDays = 0;
    let otHours = 0;
    for (const d of days) {
      if (d.status === "PRESENT") {
        // quy đổi giờ làm thành công (làm tròn 0.5, tối đa 1 công/ngày)
        workDays += Math.min(1, Math.round((d.workHours / 8) * 2) / 2);
      }
      otHours += d.otHours;
    }

    // Ngày phép hưởng lương đã duyệt trong tháng
    const paidLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: emp.id,
        status: "APPROVED",
        leaveType: { paid: true },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    let paidLeaveDays = 0;
    for (const l of paidLeaves) {
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

    await prisma.payslip.upsert({
      where: { periodId_employeeId: { periodId, employeeId: emp.id } },
      create: {
        periodId,
        employeeId: emp.id,
        workDays,
        paidLeaveDays,
        otHours,
        baseSalary: emp.baseSalary,
        allowance: emp.allowance,
        ...calc,
      },
      update: {
        workDays,
        paidLeaveDays,
        otHours,
        baseSalary: emp.baseSalary,
        allowance: emp.allowance,
        ...calc,
      },
    });
  }

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
