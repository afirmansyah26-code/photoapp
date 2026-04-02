import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// GET /api/trash — list trashed dokumentasi
export async function GET(request: Request) {
  try {
    const role = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    const userRole = role || '';

    let whereClause = 'WHERE d.deleted_at IS NOT NULL';
    const params: (string | number)[] = [];

    // Guru can only see their own trash
    if (userRole === 'guru') {
      whereClause += ' AND d.guru_id = ?';
      params.push(Number(userId));
    }

    const dokumentasi = db
      .prepare(
        `SELECT d.*, 
          (SELECT COUNT(*) FROM foto f WHERE f.dokumentasi_id = d.id) as foto_count
        FROM dokumentasi d 
        ${whereClause}
        ORDER BY d.deleted_at DESC`
      )
      .all(...params);

    // Get total trash size
    const trashDir = path.resolve(process.cwd(), 'public', 'uploads', 'trash');
    let totalSize = 0;
    if (fs.existsSync(trashDir)) {
      const countSize = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, entry.name);
          if (entry.isDirectory()) countSize(p);
          else totalSize += fs.statSync(p).size;
        }
      };
      countSize(trashDir);
    }

    return Response.json({
      success: true,
      data: {
        items: dokumentasi,
        totalSize,
      },
    });
  } catch (error) {
    console.error('Get trash error:', error);
    return Response.json(
      { success: false, error: 'Gagal mengambil data sampah' },
      { status: 500 }
    );
  }
}

// DELETE /api/trash — empty all trash permanently
export async function DELETE(request: Request) {
  try {
    const role = request.headers.get('x-user-role');
    if (role !== 'admin' && role !== 'superadmin' && role !== 'kepsek') {
      return Response.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }

    const trashDir = path.resolve(process.cwd(), 'public', 'uploads', 'trash');

    // Delete all trashed items from database permanently
    db.prepare('DELETE FROM dokumentasi WHERE deleted_at IS NOT NULL').run();

    // Remove trash folder
    if (fs.existsSync(trashDir)) {
      fs.rmSync(trashDir, { recursive: true, force: true });
    }

    return Response.json({
      success: true,
      message: 'Sampah berhasil dikosongkan',
    });
  } catch (error) {
    console.error('Empty trash error:', error);
    return Response.json(
      { success: false, error: 'Gagal mengosongkan sampah' },
      { status: 500 }
    );
  }
}
