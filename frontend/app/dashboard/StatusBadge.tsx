/** Session status pill. Icon + label, so status is never shown by color alone. */
export function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800",
    exited: "bg-[#F3EEE8] text-[#6E5E52]",
    expired: "bg-amber-50 text-amber-800",
  };
  const labels: Record<string, string> = {
    active: "● Checked in",
    exited: "← Exited",
    expired: "⏱ Expired",
  };
  const key = status ?? "";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[key] ?? "bg-gray-100 text-gray-700"}`}
    >
      {labels[key] ?? (status || "Unknown")}
    </span>
  );
}
