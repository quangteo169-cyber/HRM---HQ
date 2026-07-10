"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR, CAN_APPROVE } from "@/lib/auth";
import { toDateOnly } from "@/lib/utils";

export async function createShift(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  const name = String(fd.get("name") ?? "").trim();
  const startTime = String(fd.get("startTime") ?? "");
  const endTime = String(fd.get("endTime") ?? "");
  const breakMinutes = Number(fd.get("breakMinutes") ?? 60);
  if (!code || !name || !startTime || !endTime) {
    redirect("/shifts?error=" + encodeURIComponent("Vui lòng nhập đủ thông tin ca"));
  }
  const existed = await prisma.shift.findUnique({ where: { code } });
  if (existed) redirect("/shifts?error=" + encodeURIComponent("Mã ca đã tồn tại"));
  await prisma.shift.create({ data: { code, name, startTime, endTime, breakMinutes } });
  revalidatePath("/shifts");
  redirect("/shifts?message=" + encodeURIComponent("Đã tạo ca " + name));
}

export async function deleteShift(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const id = String(fd.get("id") ?? "");
  const count = await prisma.shiftRegistration.count({ where: { shiftId: id } });
  if (count > 0) redirect("/shifts?error=" + encodeURIComponent("Không thể xóa: ca đã có đăng ký"));
  await prisma.shift.delete({ where: { id } });
  revalidatePath("/shifts");
  redirect("/shifts?message=" + encodeURIComponent("Đã xóa ca"));
}

export async function registerShift(fd: FormData) {
  const user = await requireUser();
  if (!user.employeeId) {
    redirect("/shifts/register?error=" + encodeURIComponent("Tài khoản chưa gắn với hồ sơ nhân viên"));
  }
  const shiftId = String(fd.get("shiftId") ?? "");
  const startDate = String(fd.get("startDate") ?? "");
  const endDate = String(fd.get("endDate") ?? "");
  const note = String(fd.get("note") ?? "").trim() || null;
  if (!shiftId || !startDate || !endDate) {
    redirect("/shifts/register?error=" + encodeURIComponent("Vui lòng chọn ca và khoảng ngày"));
  }
  const s = toDateOnly(startDate);
  const e = toDateOnly(endDate);
  if (e.getTime() < s.getTime()) {
    redirect("/shifts/register?error=" + encodeURIComponent("Ngày kết thúc phải sau ngày bắt đầu"));
  }
  await prisma.shiftRegistration.create({
    data: { employeeId: user.employeeId!, shiftId, startDate: s, endDate: e, note },
  });
  revalidatePath("/shifts/register");
  redirect("/shifts/register?message=" + encodeURIComponent("Đã gửi đăng ký ca, chờ duyệt"));
}

export async function reviewShiftRegistration(fd: FormData) {
  const user = await requireUser(CAN_APPROVE);
  const id = String(fd.get("id") ?? "");
  const decision = String(fd.get("decision") ?? "");
  const back = fd.get("back") === "/dashboard" ? "/dashboard" : "/approvals";
  const reg = await prisma.shiftRegistration.findUnique({
    where: { id },
    include: { employee: { include: { department: true } } },
  });
  if (!reg || reg.status !== "PENDING") redirect(back);

  if (user.role === "MANAGER") {
    const isManager = reg.employee.department?.managerId === user.employeeId;
    if (!isManager) {
      redirect(back + "?error=" + encodeURIComponent("Bạn không phải quản lý của nhân viên này"));
    }
  }

  await prisma.shiftRegistration.update({
    where: { id },
    data: { status: decision === "approve" ? "APPROVED" : "REJECTED", approverId: user.id },
  });
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  redirect(back + "?message=" + encodeURIComponent(decision === "approve" ? "Đã duyệt đăng ký ca" : "Đã từ chối đăng ký ca"));
}
