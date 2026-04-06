import { type NextRequest } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dokumentasi = db
      .prepare('SELECT * FROM dokumentasi WHERE id = ? AND deleted_at IS NULL')
      .get(id) as Record<string, unknown> | undefined;

    if (!dokumentasi) {
      return Response.json(
        { success: false, error: 'Dokumentasi tidak ditemukan' },
        { status: 404 }
      );
    }

    const fotos = db
      .prepare('SELECT * FROM foto WHERE dokumentasi_id = ? ORDER BY sort_order')
      .all(id);

    return Response.json({
      success: true,
      data: { ...dokumentasi, fotos },
    });
  } catch (error) {
    console.error('Get dokumentasi detail error:', error);
    return Response.json(
      { success: false, error: 'Gagal mengambil detail dokumentasi' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    const dokumentasi = db
      .prepare('SELECT * FROM dokumentasi WHERE id = ? AND deleted_at IS NULL')
      .get(id) as { collage_url: string; guru_id: number } | undefined;

    if (!dokumentasi) {
      return Response.json(
        { success: false, error: 'Dokumentasi tidak ditemukan' },
        { status: 404 }
      );
    }

    if (userRole === 'guru' && String(dokumentasi.guru_id) !== userId) {
      return Response.json(
        { success: false, error: 'Anda hanya dapat menghapus dokumentasi milik Anda sendiri' },
        { status: 403 }
      );
    }

    // Get associated photos
    const fotos = db
      .prepare('SELECT * FROM foto WHERE dokumentasi_id = ?')
      .all(id) as { foto_url: string }[];

    // Move files to trash folder
    const trashDir = path.resolve(process.cwd(), 'public', 'uploads', 'trash');

    const moveToTrash = (filePath: string) => {
      try {
        const fullPath = path.join(process.cwd(), 'public', filePath);
        if (fs.existsSync(fullPath)) {
          const relativePath = filePath.replace(/^\/?(uploads\/)?/, '');
          const trashPath = path.join(trashDir, relativePath);
          const trashFolder = path.dirname(trashPath);
          if (!fs.existsSync(trashFolder)) fs.mkdirSync(trashFolder, { recursive: true });
          fs.renameSync(fullPath, trashPath);
        }
      } catch (e) {
        console.error('Failed to move to trash:', filePath, e);
      }
    };

    if (dokumentasi.collage_url) {
      moveToTrash(dokumentasi.collage_url);
    }
    fotos.forEach((foto) => {
      moveToTrash(foto.foto_url);
    });

    // Soft delete — set deleted_at timestamp
    db.prepare('UPDATE dokumentasi SET deleted_at = datetime(?) WHERE id = ?')
      .run(new Date().toISOString(), id);

    return Response.json({
      success: true,
      message: 'Dokumentasi dipindahkan ke sampah',
    });
  } catch (error) {
    console.error('Delete dokumentasi error:', error);
    return Response.json(
      { success: false, error: 'Gagal menghapus dokumentasi' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    const dokumentasi = db
      .prepare('SELECT * FROM dokumentasi WHERE id = ? AND deleted_at IS NULL')
      .get(id) as { guru_id: number } | undefined;

    if (!dokumentasi) {
      return Response.json(
        { success: false, error: 'Dokumentasi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Permission check: owner or admin/superadmin/kepsek
    if (userRole === 'guru' && String(dokumentasi.guru_id) !== userId) {
      return Response.json(
        { success: false, error: 'Anda hanya dapat mengedit dokumentasi milik Anda sendiri' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nama_kegiatan, tanggal, deskripsi, video_url } = body;

    db.prepare(
      `UPDATE dokumentasi 
       SET nama_kegiatan = ?, tanggal = ?, deskripsi = ?, video_url = ?, updated_at = datetime(?)
       WHERE id = ?`
    ).run(
      nama_kegiatan ?? '',
      tanggal ?? '',
      deskripsi ?? '',
      video_url ?? '',
      new Date().toISOString(),
      id
    );

    const updated = db.prepare('SELECT * FROM dokumentasi WHERE id = ?').get(id) as Record<string, unknown>;
    const fotos = db.prepare('SELECT * FROM foto WHERE dokumentasi_id = ? ORDER BY sort_order').all(id);

    return Response.json({
      success: true,
      data: { ...updated, fotos },
    });
  } catch (error) {
    console.error('Update dokumentasi error:', error);
    return Response.json(
      { success: false, error: 'Gagal mengupdate dokumentasi: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
