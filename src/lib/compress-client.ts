/**
 * Client-side image compression using Canvas API.
 * Resizes images before upload to reduce upload time significantly.
 */

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function compressImage(file: File): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith('image/')) return file;

  // Skip small files (< 500KB) — not worth compressing
  if (file.size < 500 * 1024) return file;

  const img = await loadImage(file);

  let { width, height } = img;

  // Only resize if larger than max dimension
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    // Still compress quality even if dimensions are fine
    if (file.size < 1024 * 1024) {
      URL.revokeObjectURL(img.src);
      return file;
    }
  }

  // Calculate new dimensions maintaining aspect ratio
  if (width > height) {
    if (width > MAX_DIMENSION) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    }
  } else {
    if (height > MAX_DIMENSION) {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(img.src);
    return file;
  }

  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  // Convert to blob
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });

  if (!blob) return file;

  // Create new File with original name
  const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  // Only use compressed version if it's actually smaller
  if (compressedFile.size >= file.size) return file;

  return compressedFile;
}

export async function compressImages(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const results: File[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const compressed = await compressImage(files[i]);
    results.push(compressed);
  }

  return results;
}
