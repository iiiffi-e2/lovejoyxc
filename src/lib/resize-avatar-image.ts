export const AVATAR_SIZE = 256;
export const WEBP_QUALITY = 0.85;
export const CROP_DISPLAY_SIZE = 280;

export type AvatarCrop = {
  zoom: number;
  offsetX: number;
  offsetY: number;
  displaySize: number;
};

type ImageSource = HTMLImageElement | ImageBitmap;

function getSize(source: ImageSource) {
  return { width: source.width, height: source.height };
}

export function getCoverScale(
  width: number,
  height: number,
  displaySize: number,
  zoom: number,
) {
  const base = Math.max(displaySize / width, displaySize / height);
  return base * zoom;
}

export function clampCropOffset(
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  displaySize: number,
  zoom: number,
) {
  const scale = getCoverScale(width, height, displaySize, zoom);
  const displayedW = width * scale;
  const displayedH = height * scale;
  const maxX = Math.max(0, (displayedW - displaySize) / 2);
  const maxY = Math.max(0, (displayedH - displaySize) / 2);
  return {
    offsetX: Math.max(-maxX, Math.min(maxX, offsetX)),
    offsetY: Math.max(-maxY, Math.min(maxY, offsetY)),
  };
}

export async function loadOrientedImageSource(
  file: File,
): Promise<{ source: ImageBitmap; previewUrl: string }> {
  const source = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    source.close();
    throw new Error("Canvas not supported.");
  }
  ctx.drawImage(source, 0, 0);
  const previewUrl = canvas.toDataURL("image/jpeg", 0.92);
  return { source, previewUrl };
}

export function cropAvatarImage(
  source: ImageSource,
  crop: AvatarCrop,
): Promise<Blob> {
  const { width, height } = getSize(source);
  const scale = getCoverScale(width, height, crop.displaySize, crop.zoom);
  const displayedW = width * scale;
  const displayedH = height * scale;
  const imgX = (crop.displaySize - displayedW) / 2 + crop.offsetX;
  const imgY = (crop.displaySize - displayedH) / 2 + crop.offsetY;

  const cropX = (0 - imgX) / scale;
  const cropY = (0 - imgY) / scale;
  const cropSize = crop.displaySize / scale;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas not supported."));
  }

  ctx.drawImage(
    source,
    cropX,
    cropY,
    cropSize,
    cropSize,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Failed to encode image.")),
      "image/webp",
      WEBP_QUALITY,
    );
  });
}
