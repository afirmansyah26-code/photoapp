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
  logoPath?: string;
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

function createHeaderSvg(width: number, namaKegiatan: string, tanggal: string, namaSekolah: string, logoBase64?: string): Buffer {
  const formattedDate = formatTanggalIndo(tanggal);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const hasLogo = !!logoBase64;
  const logoSize = 120;
  const textOffsetX = hasLogo ? (width + logoSize + 20) / 2 : width / 2;

  const logoSvg = hasLogo
    ? `<image x="30" y="${(HEADER_HEIGHT - logoSize) / 2}" width="${logoSize}" height="${logoSize}" href="data:image/png;base64,${logoBase64}" preserveAspectRatio="xMidYMid meet" />`
    : '';

  const svg = `
    <svg width="${width}" height="${HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font-family: Arial, Helvetica, sans-serif; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
        .kegiatan { fill: #2c3e50; font-size: 26px; }
        .nama { fill: #1a365d; font-size: 30px; }
        .sekolah { fill: #4a5568; font-size: 22px; }
        .tanggal { fill: #718096; font-size: 20px; }
      </style>
      ${logoSvg}
      <text x="${textOffsetX}" y="35" text-anchor="middle" class="title kegiatan">KEGIATAN</text>
      <text x="${textOffsetX}" y="72" text-anchor="middle" class="title nama">${esc(namaKegiatan.toUpperCase())}</text>
      <text x="${textOffsetX}" y="108" text-anchor="middle" class="title sekolah">${esc(namaSekolah.toUpperCase())}</text>
      <text x="${textOffsetX}" y="140" text-anchor="middle" class="title tanggal">${esc(formattedDate.toUpperCase())}</text>
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
  const { imagePaths, layout, documentId, uploadMode, namaKegiatan, tanggal, namaSekolah, logoPath } = options;

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

  // Read logo as base64 for header embedding
  let logoBase64: string | undefined;
  if (hasHeader && logoPath) {
    try {
      const fullLogoPath = path.join(process.cwd(), 'public', logoPath);
      if (fs.existsSync(fullLogoPath)) {
        logoBase64 = fs.readFileSync(fullLogoPath).toString('base64');
      }
    } catch { /* logo not found, skip */ }
  }

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
      const headerSvg = createHeaderSvg(canvasWidth, namaKegiatan!, tanggal!, namaSekolah!, logoBase64);
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
    case 'grid-1x3x3':
      photoComposites = await createHeroGridComposites(imageBuffers, 3, 2, headerOffset);
      break;
    case 'grid-1x3x3x3':
      photoComposites = await createHeroGridComposites(imageBuffers, 3, 3, headerOffset);
      break;
    case 'mosaic-4a':
      photoComposites = await createMosaic4a(imageBuffers, headerOffset);
      break;
    case 'mosaic-5a':
      photoComposites = await createMosaic5a(imageBuffers, headerOffset);
      break;
    case 'mosaic-6a':
      photoComposites = await createMosaic6a(imageBuffers, headerOffset);
      break;
    case 'mosaic-6b':
      photoComposites = await createMosaic6b(imageBuffers, headerOffset);
      break;
    case 'mosaic-6c':
      photoComposites = await createMosaic6c(imageBuffers, headerOffset);
      break;
    case 'mosaic-7a':
      photoComposites = await createMosaic7a(imageBuffers, headerOffset);
      break;
    case 'mosaic-7b':
      photoComposites = await createMosaic7b(imageBuffers, headerOffset);
      break;
    case 'mosaic-7c':
      photoComposites = await createMosaic7c(imageBuffers, headerOffset);
      break;
    case 'mosaic-8a':
      photoComposites = await createMosaic8a(imageBuffers, headerOffset);
      break;
    case 'mosaic-8b':
      photoComposites = await createMosaic8b(imageBuffers, headerOffset);
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
  } else if (layout === 'grid-1x3x3') {
    // 1 hero + 2 rows of 3: ratio ~1.25
    canvasHeight = Math.round(COLLAGE_SIZE * 1.25) + headerOffset;
  } else if (layout === 'grid-1x3x3x3') {
    // 1 hero + 3 rows of 3: ratio ~1.6
    canvasHeight = Math.round(COLLAGE_SIZE * 1.6) + headerOffset;
  } else if (
    layout === 'mosaic-4a' || layout === 'mosaic-5a' || layout === 'mosaic-6a' ||
    layout === 'mosaic-6b' || layout === 'mosaic-6c' || layout === 'mosaic-7a' ||
    layout === 'mosaic-7b' || layout === 'mosaic-7c' || layout === 'mosaic-8a' ||
    layout === 'mosaic-8b'
  ) {
    canvasHeight = Math.round(COLLAGE_SIZE * 1.33) + headerOffset;
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
    const headerSvg = createHeaderSvg(canvasWidth, namaKegiatan!, tanggal!, namaSekolah!, logoBase64);
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

/**
 * Create hero grid composites: 1 large photo spanning full width on top,
 * remaining photos in rows of `cols` below.
 * Used for grid-1x3x3 (7 photos) and grid-1x3x3x3 (10 photos).
 */
async function createHeroGridComposites(
  imageBuffers: Buffer[],
  cols: number,
  gridRows: number,
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const totalWidth = COLLAGE_SIZE;
  const totalRows = gridRows + 1; // 1 hero row + grid rows
  const heightRatio = totalRows === 3 ? 1.25 : 1.6;
  const totalHeight = Math.round(COLLAGE_SIZE * heightRatio);

  // Hero photo: full width, taller
  const heroWidth = totalWidth - gap * 2;
  const heroHeight = Math.floor((totalHeight - gap * (totalRows + 1)) * 0.4);

  // Grid cells below hero
  const remainingHeight = totalHeight - heroHeight - gap * (totalRows + 1);
  const cellWidth = Math.floor((totalWidth - gap * (cols + 1)) / cols);
  const cellHeight = Math.floor(remainingHeight / gridRows) - gap;

  const composites: { input: Buffer; left: number; top: number }[] = [];

  // Hero (first photo)
  const heroResized = await resizeWithBorder(imageBuffers[0], heroWidth, heroHeight);
  composites.push({
    input: heroResized,
    left: gap,
    top: topOffset + gap,
  });

  // Grid photos (remaining)
  const gridPhotos = imageBuffers.slice(1, 1 + cols * gridRows);
  const gridResized = await Promise.all(
    gridPhotos.map((buf) => resizeWithBorder(buf, cellWidth, cellHeight))
  );

  gridResized.forEach((buf, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    composites.push({
      input: buf,
      left: gap + col * (cellWidth + gap),
      top: topOffset + gap + heroHeight + gap + row * (cellHeight + gap),
    });
  });

  return composites;
}

/**
 * Mosaic 4a: 1 big top, bottom row = 1 tall left + 2 stacked right
 * Matches reference image 1
 */
async function createMosaic4a(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  // Photo 1: top, full width, ~50% height
  const topH = Math.floor((H - gap * 3) * 0.5);
  const topW = W - gap * 2;
  composites.push({ input: await resizeWithBorder(imageBuffers[0], topW, topH), left: gap, top: topOffset + gap });

  // Bottom section
  const botH = H - topH - gap * 3;
  const leftW = Math.floor((W - gap * 3) * 0.5);
  const rightW = W - leftW - gap * 3;
  const smallH = Math.floor((botH - gap) / 2);

  // Photo 2: bottom-left, tall
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], leftW, botH), left: gap, top: topOffset + gap + topH + gap });
  // Photo 3: bottom-right-top
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], rightW, smallH), left: gap + leftW + gap, top: topOffset + gap + topH + gap });
  // Photo 4: bottom-right-bottom
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], rightW, smallH), left: gap + leftW + gap, top: topOffset + gap + topH + gap + smallH + gap });

  return composites;
}

/**
 * Mosaic 5a: 2 top, 1 wide middle, 2 bottom
 * Matches reference image 2
 */
async function createMosaic5a(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  const rowH = Math.floor((H - gap * 4) / 3);
  const halfW = Math.floor((W - gap * 3) / 2);
  const fullW = W - gap * 2;

  // Row 1: 2 photos
  composites.push({ input: await resizeWithBorder(imageBuffers[0], halfW, rowH), left: gap, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], halfW, rowH), left: gap + halfW + gap, top: topOffset + gap });
  // Row 2: 1 wide photo
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], fullW, rowH), left: gap, top: topOffset + gap + rowH + gap });
  // Row 3: 2 photos
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], halfW, rowH), left: gap, top: topOffset + gap + rowH * 2 + gap * 2 });
  composites.push({ input: await resizeWithBorder(imageBuffers[4 % imageBuffers.length], halfW, rowH), left: gap + halfW + gap, top: topOffset + gap + rowH * 2 + gap * 2 });

  return composites;
}

/**
 * Mosaic 6a: 2 large left (stacked), 4 small right (stacked in pairs)
 * Matches reference image 3
 */
async function createMosaic6a(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  const leftW = Math.floor((W - gap * 3) * 0.55);
  const rightW = W - leftW - gap * 3;
  const halfH = Math.floor((H - gap * 3) / 2);
  const smallH = Math.floor((halfH - gap) / 2);

  // Photo 1: large left-top
  composites.push({ input: await resizeWithBorder(imageBuffers[0], leftW, halfH), left: gap, top: topOffset + gap });
  // Photo 2: large left-bottom
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], leftW, halfH), left: gap, top: topOffset + gap + halfH + gap });

  // Right column: 4 small photos stacked
  const rX = gap + leftW + gap;
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], rightW, smallH), left: rX, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], rightW, smallH), left: rX, top: topOffset + gap + smallH + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[4 % imageBuffers.length], rightW, smallH), left: rX, top: topOffset + gap + (smallH + gap) * 2 });
  composites.push({ input: await resizeWithBorder(imageBuffers[5 % imageBuffers.length], rightW, smallH), left: rX, top: topOffset + gap + (smallH + gap) * 3 });

  return composites;
}

/**
 * Mosaic 6b: Mixed — large photos left, small right, alternating rows
 * Matches reference image 4
 */
async function createMosaic6b(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  const leftW = Math.floor((W - gap * 3) * 0.55);
  const rightW = W - leftW - gap * 3;
  const rowH = Math.floor((H - gap * 4) / 3);
  const smallH = Math.floor((rowH - gap) / 2);

  const rX = gap + leftW + gap;

  // Row 1: large left + 2 small right
  composites.push({ input: await resizeWithBorder(imageBuffers[0], leftW, rowH), left: gap, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], rightW, smallH), left: rX, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[4 % imageBuffers.length], rightW, smallH), left: rX, top: topOffset + gap + smallH + gap });

  // Row 2: large left
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], leftW, rowH), left: gap, top: topOffset + gap + rowH + gap });

  // Row 3: large left + large right
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], leftW, rowH), left: gap, top: topOffset + gap + (rowH + gap) * 2 });
  composites.push({ input: await resizeWithBorder(imageBuffers[5 % imageBuffers.length], rightW, rowH * 2 + gap), left: rX, top: topOffset + gap + rowH + gap });

  return composites;
}

/**
 * Mosaic 7a: 1 large center-left, 3 small stacked right, 3 small bottom row
 * Matches reference image 5
 */
async function createMosaic7a(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  const topSectionH = Math.floor((H - gap * 3) * 0.65);
  const botH = H - topSectionH - gap * 3;
  const leftW = Math.floor((W - gap * 3) * 0.55);
  const rightW = W - leftW - gap * 3;
  const smallRightH = Math.floor((topSectionH - gap * 2) / 3);
  const thirdW = Math.floor((W - gap * 4) / 3);

  // Photo 1: large left
  composites.push({ input: await resizeWithBorder(imageBuffers[0], leftW, topSectionH), left: gap, top: topOffset + gap });

  // Right column: 3 small stacked
  const rX = gap + leftW + gap;
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], rightW, smallRightH), left: rX, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], rightW, smallRightH), left: rX, top: topOffset + gap + smallRightH + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], rightW, smallRightH), left: rX, top: topOffset + gap + (smallRightH + gap) * 2 });

  // Bottom row: 3 photos
  const botY = topOffset + gap + topSectionH + gap;
  composites.push({ input: await resizeWithBorder(imageBuffers[4 % imageBuffers.length], thirdW, botH), left: gap, top: botY });
  composites.push({ input: await resizeWithBorder(imageBuffers[5 % imageBuffers.length], thirdW, botH), left: gap + thirdW + gap, top: botY });
  composites.push({ input: await resizeWithBorder(imageBuffers[6 % imageBuffers.length], thirdW, botH), left: gap + (thirdW + gap) * 2, top: botY });

  return composites;
}

/**
 * Mosaic 6c: 1 large left + 2 stacked right (top), 3 bottom
 */
async function createMosaic6c(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  const topSectionH = Math.floor((H - gap * 3) * 0.6);
  const botH = H - topSectionH - gap * 3;
  const leftW = Math.floor((W - gap * 3) * 0.55);
  const rightW = W - leftW - gap * 3;
  const smallRightH = Math.floor((topSectionH - gap) / 2);
  const thirdW = Math.floor((W - gap * 4) / 3);

  // Photo 1: large left
  composites.push({ input: await resizeWithBorder(imageBuffers[0], leftW, topSectionH), left: gap, top: topOffset + gap });
  // Photo 2: right-top
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], rightW, smallRightH), left: gap + leftW + gap, top: topOffset + gap });
  // Photo 3: right-bottom
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], rightW, smallRightH), left: gap + leftW + gap, top: topOffset + gap + smallRightH + gap });

  // Bottom row: 3 photos
  const botY = topOffset + gap + topSectionH + gap;
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], thirdW, botH), left: gap, top: botY });
  composites.push({ input: await resizeWithBorder(imageBuffers[4 % imageBuffers.length], thirdW, botH), left: gap + thirdW + gap, top: botY });
  composites.push({ input: await resizeWithBorder(imageBuffers[5 % imageBuffers.length], thirdW, botH), left: gap + (thirdW + gap) * 2, top: botY });

  return composites;
}

/**
 * Mosaic 7b: 2 top, 3 middle, 2 bottom
 */
async function createMosaic7b(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  const rowH = Math.floor((H - gap * 4) / 3);
  const halfW = Math.floor((W - gap * 3) / 2);
  const thirdW = Math.floor((W - gap * 4) / 3);

  // Row 1: 2 photos
  composites.push({ input: await resizeWithBorder(imageBuffers[0], halfW, rowH), left: gap, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], halfW, rowH), left: gap + halfW + gap, top: topOffset + gap });
  // Row 2: 3 photos
  const r2Y = topOffset + gap + rowH + gap;
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], thirdW, rowH), left: gap, top: r2Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], thirdW, rowH), left: gap + thirdW + gap, top: r2Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[4 % imageBuffers.length], thirdW, rowH), left: gap + (thirdW + gap) * 2, top: r2Y });
  // Row 3: 2 photos
  const r3Y = topOffset + gap + (rowH + gap) * 2;
  composites.push({ input: await resizeWithBorder(imageBuffers[5 % imageBuffers.length], halfW, rowH), left: gap, top: r3Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[6 % imageBuffers.length], halfW, rowH), left: gap + halfW + gap, top: r3Y });

  return composites;
}

/**
 * Mosaic 7c: 3 top, 1 wide middle, 3 bottom
 */
async function createMosaic7c(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  const rowH = Math.floor((H - gap * 4) / 3);
  const thirdW = Math.floor((W - gap * 4) / 3);
  const fullW = W - gap * 2;

  // Row 1: 3 photos
  composites.push({ input: await resizeWithBorder(imageBuffers[0], thirdW, rowH), left: gap, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], thirdW, rowH), left: gap + thirdW + gap, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], thirdW, rowH), left: gap + (thirdW + gap) * 2, top: topOffset + gap });
  // Row 2: 1 wide
  const r2Y = topOffset + gap + rowH + gap;
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], fullW, rowH), left: gap, top: r2Y });
  // Row 3: 3 photos
  const r3Y = topOffset + gap + (rowH + gap) * 2;
  composites.push({ input: await resizeWithBorder(imageBuffers[4 % imageBuffers.length], thirdW, rowH), left: gap, top: r3Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[5 % imageBuffers.length], thirdW, rowH), left: gap + thirdW + gap, top: r3Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[6 % imageBuffers.length], thirdW, rowH), left: gap + (thirdW + gap) * 2, top: r3Y });

  return composites;
}

/**
 * Mosaic 8a: 3 top, 2 middle, 3 bottom
 */
async function createMosaic8a(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  const rowH = Math.floor((H - gap * 4) / 3);
  const thirdW = Math.floor((W - gap * 4) / 3);
  const leftMidW = Math.floor((W - gap * 3) * 0.45);
  const rightMidW = W - leftMidW - gap * 3;

  // Row 1: 3 photos
  composites.push({ input: await resizeWithBorder(imageBuffers[0], thirdW, rowH), left: gap, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], thirdW, rowH), left: gap + thirdW + gap, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], thirdW, rowH), left: gap + (thirdW + gap) * 2, top: topOffset + gap });
  // Row 2: 2 photos (unequal)
  const r2Y = topOffset + gap + rowH + gap;
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], leftMidW, rowH), left: gap, top: r2Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[4 % imageBuffers.length], rightMidW, rowH), left: gap + leftMidW + gap, top: r2Y });
  // Row 3: 3 photos
  const r3Y = topOffset + gap + (rowH + gap) * 2;
  composites.push({ input: await resizeWithBorder(imageBuffers[5 % imageBuffers.length], thirdW, rowH), left: gap, top: r3Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[6 % imageBuffers.length], thirdW, rowH), left: gap + thirdW + gap, top: r3Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[7 % imageBuffers.length], thirdW, rowH), left: gap + (thirdW + gap) * 2, top: r3Y });

  return composites;
}

/**
 * Mosaic 8b: 3 top, 3 middle, 2 bottom
 */
async function createMosaic8b(
  imageBuffers: Buffer[],
  topOffset: number
): Promise<{ input: Buffer; left: number; top: number }[]> {
  const gap = COLLAGE_GAP;
  const W = COLLAGE_SIZE;
  const H = Math.round(COLLAGE_SIZE * 1.33);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  const rowH = Math.floor((H - gap * 4) / 3);
  const thirdW = Math.floor((W - gap * 4) / 3);
  const halfW = Math.floor((W - gap * 3) / 2);

  // Row 1: 3 photos
  composites.push({ input: await resizeWithBorder(imageBuffers[0], thirdW, rowH), left: gap, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[1 % imageBuffers.length], thirdW, rowH), left: gap + thirdW + gap, top: topOffset + gap });
  composites.push({ input: await resizeWithBorder(imageBuffers[2 % imageBuffers.length], thirdW, rowH), left: gap + (thirdW + gap) * 2, top: topOffset + gap });
  // Row 2: 3 photos
  const r2Y = topOffset + gap + rowH + gap;
  composites.push({ input: await resizeWithBorder(imageBuffers[3 % imageBuffers.length], thirdW, rowH), left: gap, top: r2Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[4 % imageBuffers.length], thirdW, rowH), left: gap + thirdW + gap, top: r2Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[5 % imageBuffers.length], thirdW, rowH), left: gap + (thirdW + gap) * 2, top: r2Y });
  // Row 3: 2 photos
  const r3Y = topOffset + gap + (rowH + gap) * 2;
  composites.push({ input: await resizeWithBorder(imageBuffers[6 % imageBuffers.length], halfW, rowH), left: gap, top: r3Y });
  composites.push({ input: await resizeWithBorder(imageBuffers[7 % imageBuffers.length], halfW, rowH), left: gap + halfW + gap, top: r3Y });

  return composites;
}
