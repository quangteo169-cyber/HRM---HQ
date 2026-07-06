import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { createEmployee } from "@/actions/employees";
import EmployeeForm from "@/components/EmployeeForm";
import { FlashMessage, PageHeader } from "@/components/ui";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireUser(CAN_MANAGE_HR);
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl">
      <PageHeader title="Thêm nhân viên mới" subtitle="Nhập thông tin hồ sơ nhân sự" />
      <FlashMessage error={searchParams.error} />
      <EmployeeForm departments={departments} action={createEmployee} />
    </div>
  );
}
