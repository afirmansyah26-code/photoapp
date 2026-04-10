import { type NextRequest } from 'next/server';
import db from '@/lib/db';

// GET: anyone authenticated can read settings
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

// PUT: only admin/superadmin/kepsek can update
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
