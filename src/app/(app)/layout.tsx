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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} name={name ?? email ?? ""} pendingCount={pendingCount} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
