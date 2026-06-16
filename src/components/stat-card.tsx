import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";

type Tone = "brand" | "ink" | "success" | "warning" | "injury";

const iconTones: Record<Tone, string> = {
  brand: "bg-brand-light text-brand",
  ink: "bg-ink/5 text-ink",
  success: "bg-green-50 text-success",
  warning: "bg-amber-50 text-warning",
  injury: "bg-red-50 text-injury",
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "brand",
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Card className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            {label}
          </p>
          <p className="mt-2 text-2xl leading-none font-extrabold text-ink sm:text-3xl">
            {value}
            {unit ? (
              <span className="ml-1 text-base font-bold text-gray-400">
                {unit}
              </span>
            ) : null}
          </p>
          {hint ? (
            <div className="mt-2 text-xs font-medium text-gray-500">{hint}</div>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconTones[tone],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
