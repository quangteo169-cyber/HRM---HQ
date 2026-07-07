import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";

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
    <AppShell
      role={role}
      name={name ?? email ?? ""}
      pendingCount={pendingCount}
      today={today}
    >
      {children}
    </AppShell>
  );
}
