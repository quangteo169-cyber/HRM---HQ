import { NextResponse } from "next/server";
import { buildEmployeeTemplate } from "@/lib/employee-import";

export const dynamic = "force-dynamic";

export async function GET() {
  const buf = buildEmployeeTemplate();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-danh-sach-nhan-vien.xlsx"',
    },
  });
}
