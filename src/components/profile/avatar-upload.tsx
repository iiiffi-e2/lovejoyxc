"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Camera, Trash2, Upload } from "lucide-react";
import {
  removeAvatar,
  uploadAvatar,
  type AvatarState,
} from "@/app/actions/avatar";
import { Button } from "@/components/ui/button";

export function AvatarUpload({
  avatarUrl,
  blobConfigured,
}: {
  avatarUrl?: string | null;
  blobConfigured: boolean;
}) {
  const [state, formAction] = useActionState(uploadAvatar, {} as AvatarState);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pendingRemove, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleRemove = () => {
    setRemoveError(null);
    startRemove(async () => {
      const result = await removeAvatar();
      if (result.error) {
        setRemoveError(result.error);
        return;
      }
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  if (!blobConfigured) {
    return (
      <p className="text-sm text-gray-500">
        Photo upload is not configured in this environment.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      {preview && !state.ok ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Selected photo preview"
            className="h-16 w-16 rounded-full object-cover"
          />
          <p className="text-sm text-gray-500">Preview — upload when ready</p>
        </div>
      ) : null}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer">
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            className="sr-only"
            onChange={handleFileChange}
          />
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink transition-all hover:bg-surface">
            <Camera className="h-4 w-4" />
            Choose photo
          </span>
        </label>
        <UploadButton />
      </form>

      {avatarUrl ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pendingRemove}
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4" />
          {pendingRemove ? "Removing…" : "Remove photo"}
        </Button>
      ) : null}

      {state.error ? (
        <p className="text-sm font-medium text-injury">{state.error}</p>
      ) : null}
      {removeError ? (
        <p className="text-sm font-medium text-injury">{removeError}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">Photo updated.</p>
      ) : null}
    </div>
  );
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Upload className="h-4 w-4" />
      {pending ? "Uploading…" : "Upload"}
    </Button>
  );
}
