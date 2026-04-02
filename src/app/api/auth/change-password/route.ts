import { type NextRequest } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { hashPassword } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const userId = parseInt(request.headers.get('x-user-id') || '0');
    if (!userId) {
      return Response.json({ success: false, error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return Response.json(
        { success: false, error: 'Password lama dan baru harus diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { success: false, error: 'Password baru minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Verify current password
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId) as { password: string } | undefined;
    if (!user) {
      return Response.json({ success: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const valid = bcrypt.compareSync(currentPassword, user.password);
    if (!valid) {
      return Response.json({ success: false, error: 'Password lama tidak benar' }, { status: 400 });
    }

    // Update password
    const hashed = hashPassword(newPassword);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, userId);

    return Response.json({ success: true, message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    return Response.json({ success: false, error: 'Gagal mengubah password' }, { status: 500 });
  }
}
