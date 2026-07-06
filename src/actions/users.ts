"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function createUser(fd: FormData) {
  await requireUser(["ADMIN"]);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const role = String(fd.get("role") ?? "EMPLOYEE") as "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";
  const employeeId = String(fd.get("employeeId") ?? "") || null;

  if (!email || !email.includes("@")) {
    redirect("/users?error=" + encodeURIComponent("Email không hợp lệ"));
  }
  if (password.length < 6) {
    redirect("/users?error=" + encodeURIComponent("Mật khẩu tối thiểu 6 ký tự"));
  }
  const existed = await prisma.user.findUnique({ where: { email } });
  if (existed) redirect("/users?error=" + encodeURIComponent("Email đã được sử dụng"));

  await prisma.user.create({
    data: { email, password: bcrypt.hashSync(password, 10), role, employeeId },
  });
  revalidatePath("/users");
  redirect("/users?message=" + encodeURIComponent("Đã tạo tài khoản " + email));
}

export async function updateUserRole(fd: FormData) {
  const me = await requireUser(["ADMIN"]);
  const id = String(fd.get("id") ?? "");
  const role = String(fd.get("role") ?? "EMPLOYEE") as "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";
  if (id === me.id && role !== "ADMIN") {
    redirect("/users?error=" + encodeURIComponent("Không thể tự hạ quyền tài khoản của chính mình"));
  }
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/users");
  redirect("/users?message=" + encodeURIComponent("Đã cập nhật quyền"));
}

export async function resetUserPassword(fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = String(fd.get("id") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < 6) {
    redirect("/users?error=" + encodeURIComponent("Mật khẩu tối thiểu 6 ký tự"));
  }
  await prisma.user.update({ where: { id }, data: { password: bcrypt.hashSync(password, 10) } });
  revalidatePath("/users");
  redirect("/users?message=" + encodeURIComponent("Đã đặt lại mật khẩu"));
}

export async function deleteUser(fd: FormData) {
  const me = await requireUser(["ADMIN"]);
  const id = String(fd.get("id") ?? "");
  if (id === me.id) {
    redirect("/users?error=" + encodeURIComponent("Không thể xóa tài khoản của chính mình"));
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/users");
  redirect("/users?message=" + encodeURIComponent("Đã xóa tài khoản"));
}
