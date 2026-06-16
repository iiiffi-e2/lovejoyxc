import { cn } from "@/lib/utils";
import { TeamLogo } from "./team-logo";

const sizes = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-24 w-24",
} as const;

export function Logo({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return <TeamLogo className={cn(sizes[size], className)} />;
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <TeamLogo className="h-9 w-9 shrink-0" />
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
