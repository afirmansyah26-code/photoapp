import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

// POST /api/trash/[id] — restore from trash
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    const doc = db.prepare(
      'SELECT * FROM dokumentasi WHERE id = ? AND deleted_at IS NOT NULL'
    ).get(id) as { id: number; guru_id: number; collage_url: string } | undefined;

    if (!doc) {
      return Response.json({ success: false, error: 'Item tidak ditemukan di sampah' }, { status: 404 });
    }

    if (userRole === 'guru' && String(doc.guru_id) !== userId) {
      return Response.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }

    // Move files back from trash to original location
    const trashDir = path.resolve(process.cwd(), 'public', 'uploads', 'trash');
    const fotos = db.prepare('SELECT foto_url FROM foto WHERE dokumentasi_id = ?').all(doc.id) as { foto_url: string }[];
    const allUrls = [...fotos.map(f => f.foto_url), doc.collage_url].filter(Boolean);

    for (const fileUrl of allUrls) {
      const relativePath = fileUrl.replace(/^\/?(uploads\/)?/, '');
      const originalPath = path.join(process.cwd(), 'public', 'uploads', relativePath);
      const trashPath = path.join(trashDir, relativePath);

      if (!fs.existsSync(originalPath) && fs.existsSync(trashPath)) {
        const dir = path.dirname(originalPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.renameSync(trashPath, originalPath);
      }
    }

    // Restore — clear deleted_at
    db.prepare('UPDATE dokumentasi SET deleted_at = NULL WHERE id = ?').run(id);

    return Response.json({
      success: true,
      message: 'Dokumentasi berhasil dipulihkan',
    });
  } catch (error) {
    console.error('Restore from trash error:', error);
    return Response.json(
      { success: false, error: 'Gagal memulihkan dokumentasi' },
      { status: 500 }
    );
  }
}

// DELETE /api/trash/[id] — permanently delete single item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    const doc = db.prepare(
      'SELECT * FROM dokumentasi WHERE id = ? AND deleted_at IS NOT NULL'
    ).get(id) as { id: number; guru_id: number; collage_url: string } | undefined;

    if (!doc) {
      return Response.json({ success: false, error: 'Item tidak ditemukan di sampah' }, { status: 404 });
    }

    if (userRole === 'guru' && String(doc.guru_id) !== userId) {
      return Response.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }

    // Permanently delete files from trash
    const trashDir = path.resolve(process.cwd(), 'public', 'uploads', 'trash');
    const fotos = db.prepare('SELECT foto_url FROM foto WHERE dokumentasi_id = ?').all(doc.id) as { foto_url: string }[];
    const allUrls = [...fotos.map(f => f.foto_url), doc.collage_url].filter(Boolean);

    for (const fileUrl of allUrls) {
      const relativePath = fileUrl.replace(/^\/?(uploads\/)?/, '');
      const trashPath = path.join(trashDir, relativePath);
      try { if (fs.existsSync(trashPath)) fs.unlinkSync(trashPath); } catch { /* */ }
    }

    // Delete from database permanently
    db.prepare('DELETE FROM dokumentasi WHERE id = ?').run(id);

    return Response.json({
      success: true,
      message: 'Dokumentasi berhasil dihapus permanen',
    });
  } catch (error) {
    console.error('Permanent delete error:', error);
    return Response.json(
      { success: false, error: 'Gagal menghapus permanen' },
      { status: 500 }
    );
  }
}
