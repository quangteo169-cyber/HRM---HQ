import { prisma } from "@/lib/prisma";
import { requireUser, CAN_MANAGE_HR } from "@/lib/auth";
import { createAnnouncement, deleteAnnouncement } from "@/actions/announcements";
import { FlashMessage, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  const user = await requireUser();
  const canPost = CAN_MANAGE_HR.includes(user.role);
  const announcements = await prisma.announcement
    .findMany({ orderBy: { createdAt: "desc" }, take: 50 })
    .catch(() => []);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Bảng tin công ty"
        subtitle="Thông báo lịch nghỉ lễ, quy định, sự kiện nội bộ cho toàn thể nhân viên"
      />
      <FlashMessage message={searchParams.message} error={searchParams.error} />

      {canPost && (
        <form action={createAnnouncement} className="card mb-5 space-y-3 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Tiêu đề *</label>
              <input name="title" className="input" placeholder="VD: Thông báo lịch nghỉ lễ Quốc khánh 2/9" required />
            </div>
            <div>
              <label className="label">Nhãn</label>
              <input name="tag" className="input" placeholder="VD: LỊCH NGHỈ" />
            </div>
          </div>
          <div>
            <label className="label">Nội dung *</label>
            <textarea name="content" className="input min-h-[100px]" placeholder="Nội dung thông báo..." required />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">📢 Đăng thông báo</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {announcements.length === 0 && (
          <div className="card p-8 text-center text-sm text-slate-400">Chưa có thông báo nào</div>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {a.tag && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">
                      {a.tag}
                    </span>
                  )}
                  <h2 className="font-bold text-slate-800">{a.title}</h2>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.content}</p>
                <p className="mt-3 text-xs text-slate-400">
                  Đăng bởi <b>{a.authorName}</b> · {fmtDate(a.createdAt)}
                </p>
              </div>
              {canPost && (
                <form action={deleteAnnouncement}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="btn-danger !px-2.5 !py-1.5 text-xs">Xóa</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
