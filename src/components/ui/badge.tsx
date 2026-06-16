import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "injury" | "ink";

const tones: Record<Tone, string> = {
  neutral: "bg-surface text-gray-700 border border-line",
  brand: "bg-brand-light text-brand border border-brand/20",
  success: "bg-green-50 text-success border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  injury: "bg-red-50 text-injury border border-red-200",
  ink: "bg-ink text-white",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
