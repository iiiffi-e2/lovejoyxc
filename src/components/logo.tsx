import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-16 w-16 text-2xl",
} as const;

export function Logo({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-brand font-black tracking-tighter text-white shadow-sm",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      LXC
    </div>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size="sm" />
      <div className="leading-tight">
        <p className="text-sm font-extrabold tracking-tight text-ink">
          Lovejoy XC
        </p>
        <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
          Leopards
        </p>
      </div>
    </div>
  );
}
