"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { toDateOnly } from "@/lib/utils";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function num(fd: FormData, key: string): number {
  const v = str(fd, key);
  const n = v ? Number(v.replace(/[.,\s]/g, "")) : 0;
  return Number.isFinite(n) ? n : 0;
}

function employeeData(fd: FormData) {
  return {
    code: str(fd, "code") ?? "",
    fullName: str(fd, "fullName") ?? "",
    dob: str(fd, "dob") ? toDateOnly(str(fd, "dob")!) : null,
    gender: str(fd, "gender"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    nationalId: str(fd, "nationalId"),
    address: str(fd, "address"),
    joinDate: str(fd, "joinDate") ? toDateOnly(str(fd, "joinDate")!) : new Date(),
    status: (str(fd, "status") ?? "ACTIVE") as "PROBATION" | "ACTIVE" | "INACTIVE",
    position: str(fd, "position"),
    contractType: str(fd, "contractType"),
    baseSalary: num(fd, "baseSalary"),
    allowance: num(fd, "allowance"),
    bankAccount: str(fd, "bankAccount"),
    bankName: str(fd, "bankName"),
    departmentId: str(fd, "departmentId"),
  };
}

export async function createEmployee(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const data = employeeData(fd);
  if (!data.code || !data.fullName) {
    redirect("/employees/new?error=" + encodeURIComponent("Vui lòng nhập mã nhân viên và họ tên"));
  }
  const existed = await prisma.employee.findUnique({ where: { code: data.code } });
  if (existed) {
    redirect("/employees/new?error=" + encodeURIComponent(`Mã nhân viên ${data.code} đã tồn tại`));
  }
  const emp = await prisma.employee.create({ data });
  // Tạo số dư phép năm hiện tại
  const year = new Date().getUTCFullYear();
  await prisma.leaveBalance.upsert({
    where: { employeeId_year: { employeeId: emp.id, year } },
    create: { employeeId: emp.id, year, entitled: 12, used: 0 },
    update: {},
  });
  revalidatePath("/employees");
  redirect("/employees?message=" + encodeURIComponent("Đã thêm nhân viên " + data.fullName));
}

export async function updateEmployee(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const id = str(fd, "id");
  if (!id) redirect("/employees");
  const data = employeeData(fd);
  const dup = await prisma.employee.findFirst({ where: { code: data.code, NOT: { id: id! } } });
  if (dup) {
    redirect(`/employees/${id}?error=` + encodeURIComponent(`Mã nhân viên ${data.code} đã tồn tại`));
  }
  await prisma.employee.update({ where: { id: id! }, data });
  revalidatePath("/employees");
  redirect(`/employees/${id}?message=` + encodeURIComponent("Đã lưu thay đổi"));
}

export async function deactivateEmployee(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const id = str(fd, "id");
  if (!id) redirect("/employees");
  await prisma.employee.update({ where: { id: id! }, data: { status: "INACTIVE" } });
  revalidatePath("/employees");
  redirect("/employees?message=" + encodeURIComponent("Đã chuyển trạng thái nghỉ việc"));
}
