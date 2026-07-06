import { STATUS_LABELS } from "@/lib/utils";

const BADGE_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-600",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PROBATION: "bg-blue-50 text-blue-700",
  INACTIVE: "bg-slate-100 text-slate-500",
  DRAFT: "bg-amber-50 text-amber-700",
  FINALIZED: "bg-emerald-50 text-emerald-700",
  PRESENT: "bg-emerald-50 text-emerald-700",
  ABSENT: "bg-red-50 text-red-600",
  LEAVE: "bg-blue-50 text-blue-700",
  WEEKEND: "bg-slate-100 text-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        BADGE_COLORS[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** Hiển thị thông báo thành công / lỗi từ query string */
export function FlashMessage({
  message,
  error,
}: {
  message?: string;
  error?: string;
}) {
  if (!message && !error) return null;
  return (
    <div
      className={`mb-4 rounded-lg px-4 py-3 text-sm ${
        error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {error ?? message}
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
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
