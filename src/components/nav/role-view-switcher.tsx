"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "coach" | "admin";

const views: { id: View; href: string; label: string; Icon: typeof Shield }[] = [
  { id: "coach", href: "/coach", label: "Coach", Icon: ClipboardList },
  { id: "admin", href: "/admin", label: "Admin", Icon: Shield },
];

export function RoleViewSwitcher({ compact }: { compact?: boolean }) {
  const pathname = usePathname();
  const activeView: View = pathname.startsWith("/admin") ? "admin" : "coach";

  return (
    <div
      className={cn(
        "flex rounded-xl border border-line bg-surface p-0.5",
        compact ? "text-xs" : "text-sm",
      )}
      role="tablist"
      aria-label="Switch between coach and admin views"
    >
      {views.map(({ id, href, label, Icon }) => {
        const active = activeView === id;
        return (
          <Link
            key={id}
            href={href}
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors",
              compact ? "px-2 py-1.5" : "px-3 py-1.5",
              active
                ? "bg-white text-ink shadow-sm"
                : "text-gray-500 hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className={compact ? "hidden min-[420px]:inline" : undefined}>
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
