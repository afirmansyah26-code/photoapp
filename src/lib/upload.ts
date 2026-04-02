import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { COMPRESSED_MAX_WIDTH, COMPRESSED_QUALITY, ORIGINALS_DIR } from './constants';

export async function compressAndSaveImage(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const uploadsPath = path.join(process.cwd(), 'public', ORIGINALS_DIR);

  // Ensure directory exists
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const outputFilename = `${timestamp}-${safeName}.jpg`;
  const outputPath = path.join(uploadsPath, outputFilename);

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = await compressAndSaveImage(buffer, `photo-${i}`);
    paths.push(filePath);
  }

  return paths;
}
