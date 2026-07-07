import { STATUS_LABELS } from "@/lib/utils";

const BADGE_STYLES: Record<string, { cls: string; dot: string }> = {
  PENDING: { cls: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  APPROVED: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  REJECTED: { cls: "bg-red-50 text-red-600 ring-red-600/20", dot: "bg-red-500" },
  ACTIVE: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  PROBATION: { cls: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500" },
  INACTIVE: { cls: "bg-slate-100 text-slate-500 ring-slate-500/20", dot: "bg-slate-400" },
  DRAFT: { cls: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  FINALIZED: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  PRESENT: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  ABSENT: { cls: "bg-red-50 text-red-600 ring-red-600/20", dot: "bg-red-500" },
  LEAVE: { cls: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500" },
  WEEKEND: { cls: "bg-slate-100 text-slate-400 ring-slate-400/20", dot: "bg-slate-300" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = BADGE_STYLES[status] ?? { cls: "bg-slate-100 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** Avatar hiển thị chữ cái đầu của tên, màu sinh tự động theo tên */
const AVATAR_COLORS = [
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500",
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-teal-500", "bg-cyan-500", "bg-sky-500", "bg-pink-500",
];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const words = name.trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  const sizeCls =
    size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ${color} ${sizeCls}`}
    >
      {initials}
    </span>
  );
}

/** Hiển thị thông báo thành công / lỗi từ query string */
export function FlashMessage({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) return null;
  return (
    <div
      className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${
        error
          ? "border-red-100 bg-red-50 text-red-600"
          : "border-emerald-100 bg-emerald-50 text-emerald-700"
      }`}
    >
      <span className="mt-px">{error ? "⚠️" : "✅"}</span>
      <span>{error ?? message}</span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
