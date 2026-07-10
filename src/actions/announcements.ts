"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";

export async function createAnnouncement(fd: FormData) {
  const user = await requireUser(CAN_MANAGE_HR);
  const title = String(fd.get("title") ?? "").trim();
  const content = String(fd.get("content") ?? "").trim();
  const tag = String(fd.get("tag") ?? "").trim().toUpperCase() || null;
  if (!title || !content) {
    redirect("/announcements?error=" + encodeURIComponent("Vui lòng nhập tiêu đề và nội dung"));
  }
  await prisma.announcement.create({
    data: { title, content, tag, authorName: user.name ?? user.email ?? "HR" },
  });
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  redirect("/announcements?message=" + encodeURIComponent("Đã đăng thông báo"));
}

export async function deleteAnnouncement(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const id = String(fd.get("id") ?? "");
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  redirect("/announcements?message=" + encodeURIComponent("Đã xóa thông báo"));
}
