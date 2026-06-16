"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";

export function ShoeActions({
  retired,
  retireAction,
  deleteAction,
}: {
  retired: boolean;
  retireAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <form action={retireAction} className="flex-1">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2 text-xs font-semibold text-gray-600 hover:bg-surface"
        >
          {retired ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" /> Reactivate
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5" /> Retire
            </>
          )}
        </button>
      </form>
      <form
        action={deleteAction}
        onSubmit={(e) => {
          if (!confirm("Delete this shoe? Logged runs will be kept.")) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          aria-label="Delete shoe"
          className="flex items-center justify-center rounded-lg border border-line bg-white p-2 text-injury hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
