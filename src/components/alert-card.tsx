import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "warning" | "injury" | "brand" | "info";

const tones: Record<Tone, { wrap: string; icon: string }> = {
  warning: { wrap: "border-amber-200 bg-amber-50", icon: "text-warning" },
  injury: { wrap: "border-red-200 bg-red-50", icon: "text-injury" },
  brand: { wrap: "border-brand/20 bg-brand-light", icon: "text-brand" },
  info: { wrap: "border-line bg-white", icon: "text-gray-500" },
};

export function AlertCard({
  icon: Icon,
  tone = "warning",
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const t = tones[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border p-4", t.wrap)}>
      <div className={cn("mt-0.5 shrink-0", t.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{title}</p>
        {children ? (
          <div className="mt-0.5 text-sm text-gray-600">{children}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
