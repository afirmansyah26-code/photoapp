import { type NextRequest } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// GET: public (login page needs it)
export async function GET() {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return Response.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return Response.json({ success: false, error: 'Gagal mengambil pengaturan' }, { status: 500 });
  }
}

// PUT: update text settings (admin/superadmin/kepsek)
export async function PUT(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role');
    if (role !== 'admin' && role !== 'superadmin' && role !== 'kepsek') {
      return Response.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { app_name, school_name } = body;

    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');

    if (app_name !== undefined) {
      upsert.run('app_name', app_name, app_name);
    }
    if (school_name !== undefined) {
      upsert.run('school_name', school_name, school_name);
    }

    // Return updated settings
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return Response.json({ success: true, data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return Response.json({ success: false, error: 'Gagal mengupdate pengaturan' }, { status: 500 });
  }
}

// POST: upload logo (admin/superadmin/kepsek)
export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role');
    if (role !== 'admin' && role !== 'superadmin' && role !== 'kepsek') {
      return Response.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return Response.json({ success: false, error: 'File logo harus diupload' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return Response.json({ success: false, error: 'File harus berupa gambar' }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ success: false, error: 'Ukuran logo maksimal 5MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // Save as PNG with sharp for consistency
    const logoFilename = `logo-${Date.now()}.png`;
    const logoPath = path.join(uploadsDir, logoFilename);

    await sharp(buffer)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(logoPath);

    const logoUrl = `/uploads/${logoFilename}`;

    // Save to settings
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');
    upsert.run('logo_url', logoUrl, logoUrl);

    return Response.json({ success: true, data: { logo_url: logoUrl } });
  } catch (error) {
    console.error('Upload logo error:', error);
    return Response.json({ success: false, error: 'Gagal mengupload logo' }, { status: 500 });
  }
}
