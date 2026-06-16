"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  clampCropOffset,
  cropAvatarImage,
  CROP_DISPLAY_SIZE,
  getCoverScale,
  loadOrientedImageSource,
  type AvatarCrop,
} from "@/lib/resize-avatar-image";
import { Button } from "@/components/ui/button";

type DragState = { startX: number; startY: number; originX: number; originY: number };

export function AvatarCropDialog({
  file,
  onCancel,
  onConfirm,
  pending,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  pending?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<DragState | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadOrientedImageSource(file)
      .then(({ source, previewUrl: url }) => {
        if (cancelled) {
          source.close();
          return;
        }
        bitmapRef.current?.close();
        bitmapRef.current = source;
        setPreviewUrl(url);
        setImageSize({ width: source.width, height: source.height });
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load that image.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [file]);

  const applyOffset = useCallback(
    (x: number, y: number, nextZoom = zoom) => {
      const clamped = clampCropOffset(
        x,
        y,
        imageSize.width,
        imageSize.height,
        CROP_DISPLAY_SIZE,
        nextZoom,
      );
      setOffset({ x: clamped.offsetX, y: clamped.offsetY });
    },
    [imageSize.height, imageSize.width, zoom],
  );

  const handleZoomChange = (nextZoom: number) => {
    setZoom(nextZoom);
    applyOffset(offset.x, offset.y, nextZoom);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (loading) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    applyOffset(
      drag.originX + (e.clientX - drag.startX),
      drag.originY + (e.clientY - drag.startY),
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleSave = async () => {
    const source = bitmapRef.current;
    if (!source) return;
    const crop: AvatarCrop = {
      zoom,
      offsetX: offset.x,
      offsetY: offset.y,
      displaySize: CROP_DISPLAY_SIZE,
    };
    try {
      onConfirm(await cropAvatarImage(source, crop));
    } catch {
      setError("Could not save that photo. Try another image.");
    }
  };

  const scale =
    imageSize.width > 0
      ? getCoverScale(
          imageSize.width,
          imageSize.height,
          CROP_DISPLAY_SIZE,
          zoom,
        )
      : 1;
  const displayedW = imageSize.width * scale;
  const displayedH = imageSize.height * scale;
  const imgX = (CROP_DISPLAY_SIZE - displayedW) / 2 + offset.x;
  const imgY = (CROP_DISPLAY_SIZE - displayedH) / 2 + offset.y;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="avatar-crop-title" className="text-lg font-extrabold text-ink">
              Crop photo
            </h2>
            <p className="text-sm text-gray-500">
              Drag to reposition. Pinch or use the slider to zoom.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg p-1 text-gray-400 hover:bg-surface hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="relative mx-auto overflow-hidden rounded-xl bg-ink touch-none"
          style={{ width: CROP_DISPLAY_SIZE, height: CROP_DISPLAY_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-white/70">
              Loading…
            </div>
          ) : previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl}
              alt="Crop preview"
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                width: displayedW,
                height: displayedH,
                left: imgX,
                top: imgY,
              }}
            />
          ) : null}
          <div
            className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-white/80 ring-inset"
            aria-hidden
          />
        </div>

        <div className="mt-4">
          <label htmlFor="avatar-zoom" className="mb-1.5 block text-sm font-semibold text-ink">
            Zoom
          </label>
          <input
            id="avatar-zoom"
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            disabled={loading || pending}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="w-full accent-brand"
          />
        </div>

        {error ? (
          <p className="mt-3 text-sm font-medium text-injury">{error}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="flex-1"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="md"
            className="flex-1"
            disabled={loading || pending || !!error}
            onClick={handleSave}
          >
            {pending ? "Saving…" : "Save photo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
