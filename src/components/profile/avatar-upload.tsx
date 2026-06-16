"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import {
  removeAvatar,
  uploadAvatar,
  type AvatarState,
} from "@/app/actions/avatar";
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog";
import { Button } from "@/components/ui/button";

export function AvatarUpload({
  avatarUrl,
  blobConfigured,
}: {
  avatarUrl?: string | null;
  blobConfigured: boolean;
}) {
  const [state, setState] = useState<AvatarState>({});
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pendingUpload, startUpload] = useTransition();
  const [pendingRemove, startRemove] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setState({ error: "Photo must be JPEG, PNG, or WebP under 2 MB." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setState({ error: "Photo must be JPEG, PNG, or WebP under 2 MB." });
      return;
    }

    setState({});
    setCropFile(file);
  };

  const handleCropCancel = () => {
    setCropFile(null);
  };

  const handleCropConfirm = (blob: Blob) => {
    startUpload(async () => {
      const formData = new FormData();
      formData.append(
        "avatar",
        new File([blob], "avatar.webp", { type: "image/webp" }),
      );
      const result = await uploadAvatar({}, formData);
      setState(result);
      if (result.ok) setCropFile(null);
    });
  };

  const handleRemove = () => {
    setRemoveError(null);
    startRemove(async () => {
      const result = await removeAvatar();
      if (result.error) {
        setRemoveError(result.error);
        return;
      }
      setState({});
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
    <>
      <div className="mt-4 space-y-3 border-t border-line pt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          className="sr-only"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pendingUpload}
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          Choose photo
        </Button>

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

      {cropFile ? (
        <AvatarCropDialog
          file={cropFile}
          pending={pendingUpload}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </>
  );
}
