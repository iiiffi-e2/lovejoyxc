"use client";

import { Power } from "lucide-react";

export function ActiveToggle({
  active,
  action,
  disabled,
}: {
  active: boolean;
  action: () => Promise<void>;
  disabled?: boolean;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
          active
            ? "border-line text-gray-600 hover:bg-surface"
            : "border-green-200 bg-green-50 text-success hover:bg-green-100"
        }`}
      >
        <Power className="h-3.5 w-3.5" />
        {active ? "Deactivate" : "Activate"}
      </button>
    </form>
  );
}
