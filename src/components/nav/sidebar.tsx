"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav-config";
import { NAV_ICONS } from "./nav-icons";
import { LogoWordmark } from "@/components/logo";
import { cn } from "@/lib/utils";

export function Sidebar({
  items,
  homeHref,
}: {
  items: NavItem[];
  homeHref?: string;
}) {
  const pathname = usePathname();

  const logo = <LogoWordmark />;

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:flex">
      <div className="px-2">
        {homeHref ? (
          <Link
            href={homeHref}
            className="block rounded-lg transition-opacity hover:opacity-80"
            aria-label="Go to dashboard"
          >
            {logo}
          </Link>
        ) : (
          logo
        )}
      </div>
      <nav className="mt-8 flex-1">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = NAV_ICONS[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-brand text-white shadow-sm"
                      : "text-gray-600 hover:bg-surface hover:text-ink",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/coach" || href === "/admin" || href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
