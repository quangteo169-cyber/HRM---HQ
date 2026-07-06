"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_APPROVE, CAN_MANAGE_HR } from "@/lib/auth";
import { businessDaysBetween, toDateOnly } from "@/lib/utils";

export async function createLeaveRequest(fd: FormData) {
  const user = await requireUser();
  if (!user.employeeId) {
    redirect("/leaves?error=" + encodeURIComponent("Tài khoản chưa gắn với hồ sơ nhân viên"));
  }
  const leaveTypeId = String(fd.get("leaveTypeId") ?? "");
  const startDate = String(fd.get("startDate") ?? "");
  const endDate = String(fd.get("endDate") ?? "");
  const reason = String(fd.get("reason") ?? "").trim() || null;
  if (!leaveTypeId || !startDate || !endDate) {
    redirect("/leaves?error=" + encodeURIComponent("Vui lòng nhập đủ thông tin"));
  }
  const s = toDateOnly(startDate);
  const e = toDateOnly(endDate);
  if (e.getTime() < s.getTime()) {
    redirect("/leaves?error=" + encodeURIComponent("Ngày kết thúc phải sau ngày bắt đầu"));
  }
  const days = businessDaysBetween(s, e);
  if (days <= 0) {
    redirect("/leaves?error=" + encodeURIComponent("Khoảng nghỉ không có ngày làm việc nào"));
  }

  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType) redirect("/leaves?error=" + encodeURIComponent("Loại phép không hợp lệ"));

  // Kiểm tra số dư với phép năm
  let insufficient = false;
  if (leaveType!.code === "AL") {
    const year = s.getUTCFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId: user.employeeId!, year } },
    });
    const remaining = (balance?.entitled ?? 12) - (balance?.used ?? 0);
    if (days > remaining) insufficient = true;
  }
  if (insufficient) {
    redirect("/leaves?error=" + encodeURIComponent("Số ngày phép năm còn lại không đủ"));
  }

  await prisma.leaveRequest.create({
    data: { employeeId: user.employeeId!, leaveTypeId, startDate: s, endDate: e, days, reason },
  });
  revalidatePath("/leaves");
  redirect("/leaves?message=" + encodeURIComponent("Đã gửi đơn nghỉ phép, chờ duyệt"));
}

export async function cancelLeaveRequest(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  const req = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!req || req.employeeId !== user.employeeId || req.status !== "PENDING") {
    redirect("/leaves?error=" + encodeURIComponent("Không thể hủy đơn này"));
  }
  await prisma.leaveRequest.delete({ where: { id } });
  revalidatePath("/leaves");
  redirect("/leaves?message=" + encodeURIComponent("Đã hủy đơn"));
}

export async function reviewLeaveRequest(fd: FormData) {
  const user = await requireUser(CAN_APPROVE);
  const id = String(fd.get("id") ?? "");
  const decision = String(fd.get("decision") ?? "");
  const req = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { include: { department: true } }, leaveType: true },
  });
  if (!req || req.status !== "PENDING") redirect("/approvals");

  if (user.role === "MANAGER") {
    const isManager = req.employee.department?.managerId === user.employeeId;
    if (!isManager) {
      redirect("/approvals?error=" + encodeURIComponent("Bạn không phải quản lý của nhân viên này"));
    }
  }

  const approved = decision === "approve";
  await prisma.leaveRequest.update({
    where: { id },
    data: { status: approved ? "APPROVED" : "REJECTED", approverId: user.id, approvedAt: new Date() },
  });

  // Trừ số dư phép năm khi duyệt
  if (approved && req.leaveType.code === "AL") {
    const year = req.startDate.getUTCFullYear();
    await prisma.leaveBalance.upsert({
      where: { employeeId_year: { employeeId: req.employeeId, year } },
      create: { employeeId: req.employeeId, year, entitled: 12, used: req.days },
      update: { used: { increment: req.days } },
    });
  }

  revalidatePath("/approvals");
  revalidatePath("/leaves");
  redirect("/approvals?message=" + encodeURIComponent(approved ? "Đã duyệt đơn nghỉ phép" : "Đã từ chối đơn nghỉ phép"));
}

export async function updateLeaveBalance(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const employeeId = String(fd.get("employeeId") ?? "");
  const year = Number(fd.get("year") ?? new Date().getUTCFullYear());
  const entitled = Number(fd.get("entitled") ?? 12);
  await prisma.leaveBalance.upsert({
    where: { employeeId_year: { employeeId, year } },
    create: { employeeId, year, entitled, used: 0 },
    update: { entitled },
  });
  revalidatePath("/leaves");
  redirect("/leaves?message=" + encodeURIComponent("Đã cập nhật số ngày phép"));
}
