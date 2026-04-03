import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { COLLAGE_SIZE, COLLAGE_GAP, COLLAGES_DIR } from './constants';
import type { CollageLayout } from '@/types';

interface CollageOptions {
  imagePaths: string[];
  layout: CollageLayout;
  documentId: number;
  uploadMode?: 'single' | 'collage';
  namaKegiatan?: string;
  tanggal?: string;
  namaSekolah?: string;
}

const HEADER_HEIGHT = 160;
const PHOTO_BORDER = 8; // white border around each photo

function formatTanggalIndo(dateStr: string): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Create an education-themed background SVG with subtle icons/patterns
 */
function createEducationBackground(width: number, height: number): Buffer {
  // Education-themed decorative elements scattered across the background
  const elements: string[] = [];

  // Pencil icons (scaled up ~2x)
  const pencilSvg = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x},${y}) rotate(${rot})" opacity="0.13">
      <rect x="-5" y="-36" width="10" height="60" rx="2" fill="#4a5568"/>
      <polygon points="-5,24 5,24 0,36" fill="#f6ad55"/>
      <rect x="-5" y="-36" width="10" height="9" rx="2" fill="#e53e3e"/>
    </g>`;

  // Book icons (scaled up ~2x)
  const bookSvg = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x},${y}) rotate(${rot})" opacity="0.13">
      <rect x="-26" y="-18" width="52" height="36" rx="3" fill="#3182ce"/>
      <line x1="0" y1="-18" x2="0" y2="18" stroke="#fff" stroke-width="1.5"/>
      <rect x="-22" y="-12" width="18" height="3" rx="1" fill="#90cdf4"/>
      <rect x="-22" y="-6" width="14" height="3" rx="1" fill="#90cdf4"/>
      <rect x="-22" y="0" width="16" height="3" rx="1" fill="#90cdf4"/>
    </g>`;

  // Star icons (scaled up ~2x)
  const starSvg = (x: number, y: number, size: number) =>
    `<g transform="translate(${x},${y})" opacity="0.12">
      <polygon points="0,-${size} ${size * 0.22},-${size * 0.31} ${size * 0.95},-${size * 0.31} ${size * 0.36},${size * 0.12} ${size * 0.59},${size * 0.81} 0,${size * 0.38} -${size * 0.59},${size * 0.81} -${size * 0.36},${size * 0.12} -${size * 0.95},-${size * 0.31} -${size * 0.22},-${size * 0.31}" fill="#d69e2e"/>
    </g>`;

  // Ruler icons (scaled up ~2x)
  const rulerSvg = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x},${y}) rotate(${rot})" opacity="0.12">
      <rect x="-36" y="-7" width="72" height="14" rx="2" fill="#48bb78"/>
      <line x1="-28" y1="-7" x2="-28" y2="0" stroke="#fff" stroke-width="1.2"/>
      <line x1="-18" y1="-7" x2="-18" y2="-2" stroke="#fff" stroke-width="1.2"/>
      <line x1="-8" y1="-7" x2="-8" y2="0" stroke="#fff" stroke-width="1.2"/>
      <line x1="2" y1="-7" x2="2" y2="-2" stroke="#fff" stroke-width="1.2"/>
      <line x1="12" y1="-7" x2="12" y2="0" stroke="#fff" stroke-width="1.2"/>
      <line x1="22" y1="-7" x2="22" y2="-2" stroke="#fff" stroke-width="1.2"/>
      <line x1="32" y1="-7" x2="32" y2="0" stroke="#fff" stroke-width="1.2"/>
    </g>`;

  // Globe/world icon (scaled up ~2x)
  const globeSvg = (x: number, y: number) =>
    `<g transform="translate(${x},${y})" opacity="0.12">
      <circle cx="0" cy="0" r="24" fill="none" stroke="#3182ce" stroke-width="3"/>
      <ellipse cx="0" cy="0" rx="14" ry="24" fill="none" stroke="#3182ce" stroke-width="2"/>
      <line x1="-24" y1="0" x2="24" y2="0" stroke="#3182ce" stroke-width="1.5"/>
      <path d="M-21,-10 Q0,-13 21,-10" fill="none" stroke="#3182ce" stroke-width="1.5"/>
      <path d="M-21,10 Q0,13 21,10" fill="none" stroke="#3182ce" stroke-width="1.5"/>
    </g>`;

  // ABC text (scaled up ~2x)
  const abcSvg = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x},${y}) rotate(${rot})" opacity="0.14">
      <text font-family="Arial, sans-serif" font-weight="bold" font-size="32" fill="#e53e3e" text-anchor="middle" dominant-baseline="central">ABC</text>
    </g>`;

  // Math symbols (scaled up ~2x)
  const mathSvg = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x},${y}) rotate(${rot})" opacity="0.14">
      <text font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#805ad5" text-anchor="middle" dominant-baseline="central">+÷×</text>
    </g>`;

  // 123 numbers
  const numSvg = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x},${y}) rotate(${rot})" opacity="0.12">
      <text font-family="Arial, sans-serif" font-weight="bold" font-size="30" fill="#2b6cb0" text-anchor="middle" dominant-baseline="central">123</text>
    </g>`;

  // Distribute elements across the canvas
  const seed = width * height;
  const pseudoRandom = (i: number) => ((seed * (i + 1) * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  const spacing = 150;
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const baseX = col * spacing + spacing / 2;
      const baseY = row * spacing + spacing / 2;
      const offsetX = (pseudoRandom(idx * 3) - 0.5) * 50;
      const offsetY = (pseudoRandom(idx * 3 + 1) - 0.5) * 50;
      const x = Math.round(baseX + offsetX);
      const y = Math.round(baseY + offsetY);
      const rot = Math.round((pseudoRandom(idx * 3 + 2) - 0.5) * 60);

      const type = idx % 8;
      switch (type) {
        case 0: elements.push(pencilSvg(x, y, rot)); break;
        case 1: elements.push(bookSvg(x, y, rot)); break;
        case 2: elements.push(starSvg(x, y, 22)); break;
        case 3: elements.push(rulerSvg(x, y, rot)); break;
        case 4: elements.push(globeSvg(x, y)); break;
        case 5: elements.push(abcSvg(x, y, rot)); break;
        case 6: elements.push(mathSvg(x, y, rot)); break;
        case 7: elements.push(numSvg(x, y, rot)); break;
      }
    }
  }

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${elements.join('\n      ')}
    </svg>
  `;

  return Buffer.from(svg);
}

function createHeaderSvg(width: number, namaKegiatan: string, tanggal: string, namaSekolah: string): Buffer {
  const formattedDate = formatTanggalIndo(tanggal);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const svg = `
    <svg width="${width}" height="${HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font-family: Arial, Helvetica, sans-serif; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
        .kegiatan { fill: #2c3e50; font-size: 26px; }
        .nama { fill: #1a365d; font-size: 30px; }
        .sekolah { fill: #4a5568; font-size: 22px; }
        .tanggal { fill: #718096; font-size: 20px; }
      </style>
      <text x="${width / 2}" y="35" text-anchor="middle" class="title kegiatan">KEGIATAN</text>
      <text x="${width / 2}" y="72" text-anchor="middle" class="title nama">${esc(namaKegiatan.toUpperCase())}</text>
      <text x="${width / 2}" y="108" text-anchor="middle" class="title sekolah">${esc(namaSekolah.toUpperCase())}</text>
      <text x="${width / 2}" y="140" text-anchor="middle" class="title tanggal">${esc(formattedDate.toUpperCase())}</text>
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * Resize a photo and add a white border around it
 */
async function resizeWithBorder(buf: Buffer, width: number, height: number): Promise<Buffer> {
  const innerW = width - PHOTO_BORDER * 2;
  const innerH = height - PHOTO_BORDER * 2;

  if (innerW <= 0 || innerH <= 0) {
    return sharp(buf).resize(width, height, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toBuffer();
  }

  return sharp(buf)
    .resize(innerW, innerH, { fit: 'cover', position: 'centre' })
    .extend({
      top: PHOTO_BORDER,
      bottom: PHOTO_BORDER,
      left: PHOTO_BORDER,
      right: PHOTO_BORDER,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function generateCollage(options: CollageOptions): Promise<string> {
  const { imagePaths, layout, documentId, uploadMode, namaKegiatan, tanggal, namaSekolah } = options;

  const collagesPath = path.join(process.cwd(), 'public', COLLAGES_DIR);
  if (!fs.existsSync(collagesPath)) {
    fs.mkdirSync(collagesPath, { recursive: true });
  }

  const outputFilename = `collage-${documentId}-${Date.now()}.jpg`;
  const outputPath = path.join(collagesPath, outputFilename);

  const imageBuffers = await Promise.all(
    imagePaths.map(async (imgPath) => {
      const fullPath = path.join(process.cwd(), 'public', imgPath);
      return fs.readFileSync(fullPath);
    })
  );

  const hasHeader = !!(namaKegiatan && tanggal && namaSekolah);
  const headerOffset = hasHeader ? HEADER_HEIGHT : 0;

  // ── Single photo mode: height follows the photo's aspect ratio ──
  if (uploadMode === 'single' && imageBuffers.length > 0) {
    const padding = COLLAGE_GAP * 3;
    const photoWidth = COLLAGE_SIZE - padding * 2;

    // Read actual image dimensions
    const metadata = await sharp(imageBuffers[0]).metadata();
    const origW = metadata.width || 1200;
    const origH = metadata.height || 1200;
    const aspectRatio = origH / origW;

    // Photo height proportional to width based on original aspect ratio
    const photoHeight = Math.round(photoWidth * aspectRatio);
    const canvasWidth = COLLAGE_SIZE;
    const canvasHeight = headerOffset + padding + photoHeight + PHOTO_BORDER * 2 + padding;

    // Resize photo to fit, preserving aspect ratio (no crop)
    const innerW = photoWidth - PHOTO_BORDER * 2;
    const innerH = photoHeight - PHOTO_BORDER * 2;
    const resizedPhoto = await sharp(imageBuffers[0])
      .resize(innerW > 0 ? innerW : photoWidth, innerH > 0 ? innerH : photoHeight, { fit: 'inside', withoutEnlargement: false })
      .extend({
        top: PHOTO_BORDER,
        bottom: PHOTO_BORDER,
        left: PHOTO_BORDER,
        right: PHOTO_BORDER,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Get the actual size of the resized photo for centering
    const resizedMeta = await sharp(resizedPhoto).metadata();
    const finalPhotoW = resizedMeta.width || photoWidth;
    const photoLeft = Math.round((canvasWidth - finalPhotoW) / 2);

    const bgColor = { r: 245, g: 241, b: 235 };
    const bgPattern = createEducationBackground(canvasWidth, canvasHeight);

    const composites: sharp.OverlayOptions[] = [
      { input: bgPattern, top: 0, left: 0 },
    ];

    if (hasHeader) {
      const headerSvg = createHeaderSvg(canvasWidth, namaKegiatan!, tanggal!, namaSekolah!);
      composites.push({ input: headerSvg, top: 0, left: 0 });
    }

    composites.push({
      input: resizedPhoto,
      left: photoLeft,
      top: headerOffset + padding,
    });

    await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: bgColor,
      },
    })
      .composite(composites)
      .jpeg({ quality: 92 })
      .toFile(outputPath);

    return `/${COLLAGES_DIR}/${outputFilename}`;
  }

  // ── Collage mode (existing logic) ──
  const count = imageBuffers.length;

  let photoComposites: { input: Buffer; left: number; top: number }[] = [];

  switch (layout) {
    case 'grid-1x1':
      photoComposites = await createSingleComposite(imageBuffers, headerOffset);
      break;
    case 'grid-2x2':
      photoComposites = await createGridComposites(imageBuffers, 2, 2, headerOffset);
      break;
    case 'grid-3x3':
      photoComposites = await createGridComposites(imageBuffers, 3, 3, headerOffset);
      break;
    case 'grid-3x4':
      photoComposites = await createGridComposites(imageBuffers, 3, 4, headerOffset);
      break;
    case 'horizontal':
      photoComposites = await createHorizontalComposites(imageBuffers, headerOffset);
      break;
    case 'vertical':
      photoComposites = await createVerticalComposites(imageBuffers, headerOffset);
      break;
    default:
      if (count <= 4) {
        photoComposites = await createGridComposites(imageBuffers, 2, 2, headerOffset);
      } else if (count <= 9) {
        photoComposites = await createGridComposites(imageBuffers, 3, 3, headerOffset);
      } else {
        photoComposites = await createGridComposites(imageBuffers, 3, 4, headerOffset);
      }
  }

  let canvasWidth = COLLAGE_SIZE;
  let canvasHeight = COLLAGE_SIZE + headerOffset;

  if (layout === 'grid-1x1') {
    // Square-ish canvas for single photo
    canvasHeight = COLLAGE_SIZE + headerOffset;
  } else if (layout === 'grid-3x4') {
    // Taller canvas for 3x4 grid
    canvasHeight = Math.round(COLLAGE_SIZE * 1.33) + headerOffset;
  } else if (layout === 'horizontal') {
    const gap = COLLAGE_GAP;
    canvasHeight = 400 + gap * 2 + headerOffset;
  } else if (layout === 'vertical') {
    const gap = COLLAGE_GAP;
    canvasWidth = 600 + gap * 2;
    canvasHeight = COLLAGE_SIZE + headerOffset;
  }

  // Create background with education theme
  const bgColor = { r: 245, g: 241, b: 235 };
  const bgPattern = createEducationBackground(canvasWidth, canvasHeight);

  const allComposites: sharp.OverlayOptions[] = [
    // Layer 1: education pattern background
    { input: bgPattern, top: 0, left: 0 },
    // Layer 2+: photos
    ...photoComposites,
  ];

  if (hasHeader) {
    const headerSvg = createHeaderSvg(canvasWidth, namaKegiatan!, tanggal!, namaSekolah!);
    // Insert header after bg but before photos
    allComposites.splice(1, 0, {
      input: headerSvg,
      top: 0,
      left: 0,
    });
  }

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: bgColor,
    },
  })
    .composite(allComposites)
    .jpeg({ quality: 92 })
    .toFile(outputPath);

  return `/${COLLAGES_DIR}/${outputFilename}`;
}

async function createSingleComposite(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const totalSize = COLLAGE_SIZE;
  // Single photo with padding on all sides
  const padding = gap * 3;
  const photoWidth = totalSize - padding * 2;
  const photoHeight = totalSize - padding * 2;

  const resized = await resizeWithBorder(imageBuffers[0], photoWidth, photoHeight);

  return [{
    input: resized,
    left: padding,
    top: topOffset + padding,
  }];
}

async function createGridComposites(
  imageBuffers: Buffer[],
  cols: number,
  rows: number,
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const totalWidth = COLLAGE_SIZE;
  // For 3x4, use taller canvas
  const totalHeight = rows > 3 ? Math.round(COLLAGE_SIZE * 1.33) : COLLAGE_SIZE;
  const cellWidth = Math.floor((totalWidth - gap * (cols + 1)) / cols);
  const cellHeight = Math.floor((totalHeight - gap * (rows + 1)) / rows);

  const resized = await Promise.all(
    imageBuffers.slice(0, cols * rows).map((buf) => resizeWithBorder(buf, cellWidth, cellHeight))
  );

  return resized.map((buf, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      input: buf,
      left: gap + col * (cellWidth + gap),
      top: topOffset + gap + row * (cellHeight + gap),
    };
  });
}

async function createHorizontalComposites(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const count = imageBuffers.length;
  const cellHeight = 400;
  const cellWidth = Math.floor((COLLAGE_SIZE - gap * (count + 1)) / count);

  const resized = await Promise.all(
    imageBuffers.map((buf) => resizeWithBorder(buf, cellWidth, cellHeight))
  );

  return resized.map((buf, index) => ({
    input: buf,
    left: gap + index * (cellWidth + gap),
    top: topOffset + gap,
  }));
}

async function createVerticalComposites(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const count = imageBuffers.length;
  const cellWidth = 600;
  const cellHeight = Math.floor((COLLAGE_SIZE - gap * (count + 1)) / count);

  const resized = await Promise.all(
    imageBuffers.map((buf) => resizeWithBorder(buf, cellWidth, cellHeight))
  );

  return resized.map((buf, index) => ({
    input: buf,
    left: gap,
    top: topOffset + gap + index * (cellHeight + gap),
  }));
}
