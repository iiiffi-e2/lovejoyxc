"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, X } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

type DeleteAction = (prev: AdminState, formData: FormData) => Promise<AdminState>;

export function DeleteUserButton({
  name,
  roleLabel,
  action,
  disabled,
  disabledReason,
  variant = "icon",
}: {
  name: string;
  roleLabel: string;
  action: DeleteAction;
  disabled?: boolean;
  disabledReason?: string;
  variant?: "icon" | "full";
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction] = useActionState(action, {} as AdminState);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const confirmed = confirmText === "CONFIRM";

  return (
    <>
      <Button
        type="button"
        variant={variant === "icon" ? "ghost" : "danger"}
        size={variant === "icon" ? "sm" : "md"}
        disabled={disabled}
        title={disabled ? disabledReason : `Delete ${name}`}
        onClick={() => {
          setConfirmText("");
          setOpen(true);
        }}
        className={variant === "icon" ? "text-injury hover:text-injury" : undefined}
      >
        <Trash2 className="h-4 w-4" />
        {variant === "full" ? "Delete person" : null}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-surface hover:text-ink"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>

            <h2 id="delete-user-title" className="pr-8 text-lg font-bold text-ink">
              Delete {name}?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This permanently removes this {roleLabel.toLowerCase()} and all associated
              data, including workout logs, shoes, and coach notes. This cannot be undone.
            </p>

            <form action={formAction} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="delete-confirmation">
                  Type <span className="font-mono text-injury">CONFIRM</span> to delete
                </Label>
                <Input
                  id="delete-confirmation"
                  name="confirmation"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  placeholder="CONFIRM"
                />
              </div>

              {state.error ? (
                <p className="text-sm font-medium text-injury">{state.error}</p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" size="md" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <DeleteSubmitButton disabled={!confirmed} />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DeleteSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" size="md" disabled={disabled || pending}>
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting…" : "Delete permanently"}
    </Button>
  );
}
