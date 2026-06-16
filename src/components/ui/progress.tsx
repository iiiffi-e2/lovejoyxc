import { cn } from "@/lib/utils";

export function Progress({
  value,
  tone = "brand",
  className,
}: {
  value: number; // 0-100
  tone?: "brand" | "success" | "warning" | "injury";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const tones = {
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    injury: "bg-injury",
  } as const;
  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-surface",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
