"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";

export async function createDepartment(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const name = String(fd.get("name") ?? "").trim();
  if (!name) redirect("/departments?error=" + encodeURIComponent("Vui lòng nhập tên phòng ban"));
  const existed = await prisma.department.findUnique({ where: { name } });
  if (existed) redirect("/departments?error=" + encodeURIComponent("Phòng ban đã tồn tại"));
  await prisma.department.create({ data: { name } });
  revalidatePath("/departments");
  redirect("/departments?message=" + encodeURIComponent("Đã tạo phòng ban " + name));
}

export async function setDepartmentManager(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const id = String(fd.get("id") ?? "");
  const managerId = String(fd.get("managerId") ?? "") || null;
  await prisma.department.update({ where: { id }, data: { managerId } });
  revalidatePath("/departments");
  redirect("/departments?message=" + encodeURIComponent("Đã cập nhật trưởng phòng"));
}

export async function deleteDepartment(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const id = String(fd.get("id") ?? "");
  const count = await prisma.employee.count({ where: { departmentId: id } });
  if (count > 0) {
    redirect("/departments?error=" + encodeURIComponent("Không thể xóa: phòng ban còn nhân viên"));
  }
  await prisma.department.delete({ where: { id } });
  revalidatePath("/departments");
  redirect("/departments?message=" + encodeURIComponent("Đã xóa phòng ban"));
}
