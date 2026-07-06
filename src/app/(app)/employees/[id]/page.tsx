import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { updateEmployee, deactivateEmployee } from "@/actions/employees";
import EmployeeForm from "@/components/EmployeeForm";
import { FlashMessage, PageHeader, StatusBadge } from "@/components/ui";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { message?: string; error?: string };
}) {
  const user = await requireUser(["ADMIN", "HR", "MANAGER"]);
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { department: true, user: true },
  });
  if (!employee) notFound();

  // Quản lý chỉ xem nhân viên phòng mình
  if (user.role === "MANAGER" && employee.department?.managerId !== user.employeeId) {
    notFound();
  }

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const canEdit = CAN_MANAGE_HR.includes(user.role);

  return (
    <div className="max-w-4xl">
      <PageHeader title={employee.fullName} subtitle={`Mã NV: ${employee.code}`}>
        <StatusBadge status={employee.status} />
        {canEdit && employee.status !== "INACTIVE" && (
          <form action={deactivateEmployee}>
            <input type="hidden" name="id" value={employee.id} />
            <button type="submit" className="btn-danger">
              Chuyển nghỉ việc
            </button>
          </form>
        )}
      </PageHeader>

      <FlashMessage message={searchParams.message} error={searchParams.error} />

      {employee.user && (
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Tài khoản đăng nhập: <b>{employee.user.email}</b> — quyền {employee.user.role}
        </div>
      )}

      <EmployeeForm
        employee={employee}
        departments={departments}
        action={updateEmployee}
        readOnly={!canEdit}
      />
    </div>
  );
}
