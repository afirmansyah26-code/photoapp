import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const filePath = segments.join('/');

    // Security: prevent path traversal
    const safePath = filePath.replace(/\.\./g, '');
    const fullPath = path.resolve(process.cwd(), 'public', 'uploads', safePath);
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');

    if (!fullPath.startsWith(uploadsDir)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
      return new Response('Not found', { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const fileBuffer = fs.readFileSync(fullPath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Internal error', { status: 500 });
  }
}
