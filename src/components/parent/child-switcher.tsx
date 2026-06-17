"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { Select } from "@/components/ui/field";
import { setParentChildAction } from "@/app/actions/parent-child";
import type { LinkedAthlete } from "@/lib/parent-access";

export function ChildSwitcher({ linked }: { linked: LinkedAthlete[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selected =
    searchParams.get("child") && linked.some((a) => a.id === searchParams.get("child"))
      ? searchParams.get("child")!
      : linked[0]!.id;

  function onChange(athleteId: string) {
    startTransition(async () => {
      await setParentChildAction(athleteId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("child", athleteId);
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const current = linked.find((a) => a.id === selected) ?? linked[0]!;

  return (
    <div className="flex items-center gap-2">
      <UserAvatar
        name={current.name}
        avatarUrl={current.avatarUrl}
        size="sm"
        className="hidden sm:flex"
      />
      <Select
        aria-label="Select athlete"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[10rem] text-sm sm:max-w-[12rem]"
      >
        {linked.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
