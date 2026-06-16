import Link from "next/link";
import { Logo, LogoWordmark } from "@/components/logo";
import { UserMenu } from "./user-menu";

export function TopBar({
  title,
  subtitle,
  user,
  actions,
  homeHref,
}: {
  title?: string;
  subtitle?: string;
  user: { name: string; role: string; avatarUrl?: string | null };
  actions?: React.ReactNode;
  homeHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {homeHref ? (
            <Link
              href={homeHref}
              className="shrink-0 rounded-lg transition-opacity hover:opacity-80"
              aria-label="Go to dashboard"
            >
              <span className="sm:hidden">
                <Logo size="sm" />
              </span>
              <span className="hidden sm:block">
                <LogoWordmark />
              </span>
            </Link>
          ) : (
            <span className="md:hidden">
              <Logo size="sm" />
            </span>
          )}
          <div className="min-w-0">
            {title && !homeHref ? (
              <h1 className="truncate text-lg font-extrabold tracking-tight text-ink">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="truncate text-xs text-gray-400">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <UserMenu
            name={user.name}
            role={user.role}
            avatarUrl={user.avatarUrl}
          />
        </div>
      </div>
    </header>
  );
}
