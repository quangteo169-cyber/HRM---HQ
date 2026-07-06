"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { parseAttendanceCsv, processAttendanceMonth } from "@/lib/attendance";

export async function importAttendanceFile(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/attendance/import?error=" + encodeURIComponent("Vui lòng chọn file dữ liệu chấm công"));
  }
  const text = await (file as File).text();
  const { punches, skipped } = parseAttendanceCsv(text);
  if (punches.length === 0) {
    redirect("/attendance/import?error=" + encodeURIComponent("Không đọc được dòng dữ liệu hợp lệ nào từ file"));
  }

  const result = await prisma.attendanceRecord.createMany({
    data: punches.map((p) => ({
      employeeCode: p.employeeCode,
      timestamp: p.timestamp,
      device: p.device ?? null,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/attendance");
  redirect(
    "/attendance/import?message=" +
      encodeURIComponent(
        `Đã nhập ${result.count} lượt chấm công mới (${punches.length - result.count} trùng lặp, ${skipped} dòng bỏ qua). Hãy bấm "Tổng hợp công" để cập nhật bảng công.`
      )
  );
}

export async function processMonthAction(fd: FormData) {
  await requireUser(CAN_MANAGE_HR);
  const month = Number(fd.get("month"));
  const year = Number(fd.get("year"));
  if (!month || !year || month < 1 || month > 12) {
    redirect("/attendance/import?error=" + encodeURIComponent("Tháng/năm không hợp lệ"));
  }
  await processAttendanceMonth(year, month);
  revalidatePath("/attendance");
  redirect(
    `/attendance?month=${month}&year=${year}&message=` +
      encodeURIComponent(`Đã tổng hợp công tháng ${month}/${year}`)
  );
}
