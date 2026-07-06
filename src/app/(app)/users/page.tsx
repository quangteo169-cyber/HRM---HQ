import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createUser, updateUserRole, resetUserPassword, deleteUser } from "@/actions/users";
import { FlashMessage, PageHeader } from "@/components/ui";
import { ROLE_LABELS, fmtDate } from "@/lib/utils";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  const me = await requireUser(["ADMIN"]);

  const [users, employees] = await Promise.all([
    prisma.user.findMany({
      include: { employee: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.employee.findMany({
      where: { status: { not: "INACTIVE" }, user: null },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Tài khoản & phân quyền"
        subtitle="ADMIN: toàn quyền • HR: quản lý nhân sự, công, lương • Quản lý: duyệt đơn phòng mình • Nhân viên: tự phục vụ"
      />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      <form action={createUser} className="card mb-5 grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label">Email đăng nhập *</label>
          <input type="email" name="email" className="input" placeholder="ten@hqgroups.vn" required />
        </div>
        <div>
          <label className="label">Mật khẩu * (≥ 6 ký tự)</label>
          <input type="text" name="password" className="input" placeholder="Mật khẩu ban đầu" required minLength={6} />
        </div>
        <div>
          <label className="label">Quyền</label>
          <select name="role" className="input" defaultValue="EMPLOYEE">
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Gắn với nhân viên</label>
          <select name="employeeId" className="input" defaultValue="">
            <option value="">— Không gắn —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName} ({e.code})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          ➕ Tạo tài khoản
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr>
              <th className="th">Email</th>
              <th className="th">Nhân viên</th>
              <th className="th">Ngày tạo</th>
              <th className="th">Quyền</th>
              <th className="th">Đặt lại mật khẩu</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td font-medium">
                  {u.email}
                  {u.id === me.id && <span className="ml-1 text-xs text-blue-500">(bạn)</span>}
                </td>
                <td className="td">
                  {u.employee ? `${u.employee.fullName} (${u.employee.code})` : "—"}
                </td>
                <td className="td">{fmtDate(u.createdAt)}</td>
                <td className="td">
                  <form action={updateUserRole} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" className="input w-40" defaultValue={u.role}>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-secondary">
                      Lưu
                    </button>
                  </form>
                </td>
                <td className="td">
                  <form action={resetUserPassword} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input
                      type="text"
                      name="password"
                      className="input w-36"
                      placeholder="Mật khẩu mới"
                      minLength={6}
                      required
                    />
                    <button type="submit" className="btn-secondary">
                      Đặt lại
                    </button>
                  </form>
                </td>
                <td className="td text-right">
                  {u.id !== me.id && (
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className="btn-danger">
                        Xóa
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
