import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const year = new Date().getUTCFullYear();

  // ===== Phòng ban =====
  const [bgd, hcns, kd, kt] = await Promise.all(
    ["Ban Giám đốc", "Hành chính - Nhân sự", "Kinh doanh", "Kỹ thuật"].map((name) =>
      prisma.department.upsert({ where: { name }, create: { name }, update: {} })
    )
  );

  // ===== Ca làm việc =====
  await prisma.shift.upsert({
    where: { code: "HC" },
    create: { code: "HC", name: "Hành chính (08:00 - 17:30)", startTime: "08:00", endTime: "17:30", breakMinutes: 90 },
    update: {},
  });
  await prisma.shift.upsert({
    where: { code: "CA1" },
    create: { code: "CA1", name: "Ca sáng (06:00 - 14:00)", startTime: "06:00", endTime: "14:00", breakMinutes: 30 },
    update: {},
  });
  await prisma.shift.upsert({
    where: { code: "CA2" },
    create: { code: "CA2", name: "Ca chiều (14:00 - 22:00)", startTime: "14:00", endTime: "22:00", breakMinutes: 30 },
    update: {},
  });

  // ===== Loại nghỉ phép =====
  await prisma.leaveType.upsert({
    where: { code: "AL" },
    create: { code: "AL", name: "Nghỉ phép năm", paid: true, annualQuota: 12 },
    update: {},
  });
  await prisma.leaveType.upsert({
    where: { code: "SICK" },
    create: { code: "SICK", name: "Nghỉ ốm (hưởng BHXH)", paid: false, annualQuota: 0 },
    update: {},
  });
  await prisma.leaveType.upsert({
    where: { code: "UNPAID" },
    create: { code: "UNPAID", name: "Nghỉ không lương", paid: false, annualQuota: 0 },
    update: {},
  });
  await prisma.leaveType.upsert({
    where: { code: "WEDDING" },
    create: { code: "WEDDING", name: "Nghỉ cưới (hưởng lương)", paid: true, annualQuota: 3 },
    update: {},
  });

  // ===== Nhân viên mẫu =====
  async function upsertEmployee(data: {
    code: string; fullName: string; departmentId: string; position: string;
    baseSalary: number; allowance?: number; email?: string;
  }) {
    const emp = await prisma.employee.upsert({
      where: { code: data.code },
      create: {
        code: data.code,
        fullName: data.fullName,
        departmentId: data.departmentId,
        position: data.position,
        baseSalary: data.baseSalary,
        allowance: data.allowance ?? 0,
        email: data.email,
        joinDate: new Date(Date.UTC(year - 1, 0, 1)),
        status: "ACTIVE",
        contractType: "Không xác định thời hạn",
      },
      update: {},
    });
    await prisma.leaveBalance.upsert({
      where: { employeeId_year: { employeeId: emp.id, year } },
      create: { employeeId: emp.id, year, entitled: 12, used: 0 },
      update: {},
    });
    return emp;
  }

  const hrEmp = await upsertEmployee({
    code: "HQ001", fullName: "Trần Thị Nhân Sự", departmentId: hcns.id,
    position: "Trưởng phòng Nhân sự", baseSalary: 20_000_000, allowance: 2_000_000,
    email: "hr@hqgroup.vn",
  });
  const mgrEmp = await upsertEmployee({
    code: "HQ002", fullName: "Nguyễn Văn Quản Lý", departmentId: kd.id,
    position: "Trưởng phòng Kinh doanh", baseSalary: 25_000_000, allowance: 3_000_000,
    email: "manager@hqgroup.vn",
  });
  const emp1 = await upsertEmployee({
    code: "HQ003", fullName: "Lê Văn An", departmentId: kd.id,
    position: "Nhân viên kinh doanh", baseSalary: 12_000_000, allowance: 1_000_000,
    email: "an.le@hqgroup.vn",
  });
  await upsertEmployee({
    code: "HQ004", fullName: "Phạm Thị Bình", departmentId: kt.id,
    position: "Kỹ sư phần mềm", baseSalary: 18_000_000, allowance: 1_500_000,
    email: "binh.pham@hqgroup.vn",
  });

  // Gán trưởng phòng duyệt đơn cho phòng Kinh doanh & HCNS
  await prisma.department.update({ where: { id: kd.id }, data: { managerId: mgrEmp.id } });
  await prisma.department.update({ where: { id: hcns.id }, data: { managerId: hrEmp.id } });

  // ===== Tài khoản =====
  async function upsertUser(email: string, password: string, role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE", employeeId?: string) {
    await prisma.user.upsert({
      where: { email },
      create: { email, password: bcrypt.hashSync(password, 10), role, employeeId },
      update: {},
    });
  }

  await upsertUser("admin@hqgroup.vn", "admin@123", "ADMIN");
  await upsertUser("hr@hqgroup.vn", "hr@12345", "HR", hrEmp.id);
  await upsertUser("manager@hqgroup.vn", "manager@123", "MANAGER", mgrEmp.id);
  await upsertUser("an.le@hqgroup.vn", "nhanvien@123", "EMPLOYEE", emp1.id);

  console.log("✔ Seed dữ liệu thành công!");
  console.log("Tài khoản mặc định:");
  console.log("  ADMIN   : admin@hqgroup.vn / admin@123");
  console.log("  HR      : hr@hqgroup.vn / hr@12345");
  console.log("  QUẢN LÝ : manager@hqgroup.vn / manager@123");
  console.log("  NHÂN VIÊN: an.le@hqgroup.vn / nhanvien@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
