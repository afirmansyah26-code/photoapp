import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

    const stat = fs.statSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Generate ETag from file size + mtime
    const etag = `"${crypto.createHash('md5').update(`${stat.size}-${stat.mtimeMs}`).digest('hex')}"`;

    // Check If-None-Match for conditional request
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new Response(null, { status: 304 });
    }

    // Stream file instead of reading entirely into memory
    const stream = fs.createReadStream(fullPath);
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'ETag': etag,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Internal error', { status: 500 });
  }
}
