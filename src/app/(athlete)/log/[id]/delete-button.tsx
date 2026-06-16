"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteLogButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this log? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="ghost" size="md" className="w-full text-injury">
        <Trash2 className="h-4 w-4" />
        Delete log
      </Button>
    </form>
  );
}
