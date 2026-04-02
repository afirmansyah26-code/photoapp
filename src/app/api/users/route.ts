import { type NextRequest } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const users = db
      .prepare('SELECT id, username, name, role, created_at FROM users ORDER BY name')
      .all();

    return Response.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    return Response.json(
      { success: false, error: 'Gagal mengambil data pengguna' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role');
    if (role !== 'admin' && role !== 'superadmin' && role !== 'kepsek') {
      return Response.json(
        { success: false, error: 'Akses ditolak' },
        { status: 403 }
      );
    }

    const { username, password, name, userRole } = await request.json();

    if (!username || !password || !name) {
      return Response.json(
        { success: false, error: 'Username, password, dan nama harus diisi' },
        { status: 400 }
      );
    }

    // Check if username exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return Response.json(
        { success: false, error: 'Username sudah digunakan' },
        { status: 409 }
      );
    }

    const hashedPassword = hashPassword(password);
    const result = db
      .prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
      .run(username, hashedPassword, name, userRole || 'guru');

    return Response.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        username,
        name,
        role: userRole || 'guru',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return Response.json(
      { success: false, error: 'Gagal membuat pengguna' },
      { status: 500 }
    );
  }
}
