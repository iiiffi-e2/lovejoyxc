import Image from "next/image";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-xl",
} as const;

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const dim = sizes[size];
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={64}
        height={64}
        className={cn("rounded-full object-cover", dim, className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-ink font-bold text-white",
        dim,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
