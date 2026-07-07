import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { role, employeeId, name, email } = session.user;

  // Đếm số đơn chờ duyệt cho badge
  let pendingCount = 0;
  if (["ADMIN", "HR", "MANAGER"].includes(role)) {
    const managerFilter =
      role === "MANAGER"
        ? { employee: { department: { managerId: employeeId ?? "___" } } }
        : {};
    const [leaves, shifts] = await Promise.all([
      prisma.leaveRequest.count({ where: { status: "PENDING", ...managerFilter } }),
      prisma.shiftRegistration.count({ where: { status: "PENDING", ...managerFilter } }),
    ]);
    pendingCount = leaves + shifts;
  }

  const today = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} name={name ?? email ?? ""} pendingCount={pendingCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
          <div className="text-sm capitalize text-slate-500">📆 {today}</div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="hidden font-medium sm:inline">{name ?? email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
