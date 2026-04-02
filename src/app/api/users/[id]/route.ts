import { type NextRequest } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role');
    if (role !== 'admin' && role !== 'superadmin' && role !== 'kepsek') {
      return Response.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const { name, username, password, userRole } = await request.json();

    // If target is superadmin, don't allow role changes (protect superadmin role)
    const target = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
    if (!target) {
      return Response.json({ success: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    // Force keep superadmin role — it can't be changed
    const finalRole = target.role === 'superadmin' ? 'superadmin' : (userRole || target.role);

    // Check username uniqueness (exclude current user)
    if (username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
      if (existing) {
        return Response.json({ success: false, error: 'Username sudah digunakan' }, { status: 409 });
      }
    }

    if (password) {
      const hashed = hashPassword(password);
      db.prepare('UPDATE users SET name = ?, username = ?, password = ?, role = ? WHERE id = ?')
        .run(name, username, hashed, finalRole, userId);
    } else {
      db.prepare('UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?')
        .run(name, username, finalRole, userId);
    }

    return Response.json({ success: true, data: { id: userId, name, username, role: finalRole } });
  } catch (error) {
    console.error('Update user error:', error);
    return Response.json({ success: false, error: 'Gagal mengupdate pengguna' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role');
    if (role !== 'admin' && role !== 'superadmin' && role !== 'kepsek') {
      return Response.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const currentUserId = parseInt(request.headers.get('x-user-id') || '0');

    // Can't delete yourself
    if (userId === currentUserId) {
      return Response.json({ success: false, error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 });
    }

    // Can't delete superadmin
    const target = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
    if (!target) {
      return Response.json({ success: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    if (target.role === 'superadmin') {
      return Response.json({ success: false, error: 'Super Administrator tidak dapat dihapus' }, { status: 403 });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return Response.json({ success: false, error: 'Gagal menghapus pengguna' }, { status: 500 });
  }
}
