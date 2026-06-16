"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { UserAvatar } from "@/components/user-avatar";
import { settingsPath } from "@/lib/settings-path";

export function UserMenu({
  name,
  role,
  avatarUrl,
}: {
  name: string;
  role: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pr-3 pl-1 transition-colors hover:bg-surface"
      >
        <UserAvatar name={name} avatarUrl={avatarUrl} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-bold text-ink">{name}</span>
          <span className="block text-[11px] text-gray-400 capitalize">
            {role.toLowerCase()}
          </span>
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
          <div className="border-b border-line px-3 py-2 sm:hidden">
            <p className="text-sm font-bold text-ink">{name}</p>
            <p className="text-xs text-gray-400 capitalize">
              {role.toLowerCase()}
            </p>
          </div>
          <Link
            href={settingsPath(role)}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-ink hover:bg-surface"
          >
            <Settings className="h-4 w-4" />
            Account settings
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-ink hover:bg-surface"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
