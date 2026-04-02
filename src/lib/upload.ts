import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { COMPRESSED_MAX_WIDTH, COMPRESSED_QUALITY, ORIGINALS_DIR, MAX_FILE_SIZE } from './constants';

// Validate image by checking magic bytes (file signature)
function isValidImage(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;

  return false;
}

export async function compressAndSaveImage(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const uploadsPath = path.join(process.cwd(), 'public', ORIGINALS_DIR);

  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  const timestamp = Date.now();
  // Strict sanitize: only allow alphanumeric, dash, underscore
  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  const outputFilename = `${timestamp}-${safeName}.jpg`;
  const outputPath = path.join(uploadsPath, outputFilename);

  // Verify path doesn't escape uploads directory (path traversal protection)
  const resolvedPath = path.resolve(outputPath);
  const resolvedUploads = path.resolve(uploadsPath);
  if (!resolvedPath.startsWith(resolvedUploads)) {
    throw new Error('Invalid file path detected');
  }

  await sharp(buffer)
    .resize(COMPRESSED_MAX_WIDTH, null, {
      withoutEnlargement: true,
      fit: 'inside',
    })
    .jpeg({ quality: COMPRESSED_QUALITY })
    .toFile(outputPath);

  return `/${ORIGINALS_DIR}/${outputFilename}`;
}

export async function processUploadedFiles(
  formData: FormData
): Promise<string[]> {
  const files = formData.getAll('photos') as File[];
  const paths: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file || !file.size) continue;

    // Server-side file size check
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File "${file.name}" melebihi batas ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes — reject non-image files
    if (!isValidImage(buffer)) {
      throw new Error(`File "${file.name}" bukan format gambar yang valid (JPG/PNG/WebP)`);
    }

    const filePath = await compressAndSaveImage(buffer, `photo-${i}`);
    paths.push(filePath);
  }

  return paths;
}
