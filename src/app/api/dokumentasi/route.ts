import { type NextRequest } from 'next/server';
import db from '@/lib/db';
import { generateCollage } from '@/lib/collage';
import type { CollageLayout } from '@/types';
import { SCHOOL_NAME } from '@/lib/constants';
import { safeError } from '@/lib/safe-error';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const tanggal = searchParams.get('tanggal');
    const guru = searchParams.get('guru');
    const search = searchParams.get('search');

    let whereClause = 'WHERE d.deleted_at IS NULL';
    const params: (string | number)[] = [];

    if (tanggal) {
      whereClause += ' AND d.tanggal = ?';
      params.push(tanggal);
    }
    if (guru) {
      whereClause += ' AND d.guru_name LIKE ?';
      params.push(`%${guru}%`);
    }
    if (search) {
      whereClause += ' AND (d.deskripsi LIKE ? OR d.nama_kegiatan LIKE ? OR d.guru_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const offset = (page - 1) * limit;

    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM dokumentasi d ${whereClause}`)
      .get(...params) as { total: number };

    const dokumentasi = db
      .prepare(
        `SELECT d.*, 
          (SELECT COUNT(*) FROM foto f WHERE f.dokumentasi_id = d.id) as foto_count
        FROM dokumentasi d 
        ${whereClause}
        ORDER BY d.tanggal DESC, d.created_at DESC
        LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return Response.json({
      success: true,
      data: {
        items: dokumentasi,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Get dokumentasi error:', error);
    return Response.json(
      { success: false, error: 'Gagal mengambil data dokumentasi' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, guru_id, guru_name, nama_kegiatan, deskripsi, video_url, layout, upload_mode, photo_paths } = body;

    if (!tanggal || !guru_id || !guru_name || !nama_kegiatan) {
      return Response.json(
        { success: false, error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    if (!photo_paths || photo_paths.length === 0) {
      return Response.json(
        { success: false, error: 'Minimal satu foto harus diupload' },
        { status: 400 }
      );
    }

    const mode = upload_mode === 'single' ? 'single' : 'collage';

    // Single mode: only use the first photo
    const photosToUse = mode === 'single' ? [photo_paths[0]] : photo_paths;

    // Insert dokumentasi
    const insertDoc = db.prepare(
      `INSERT INTO dokumentasi (tanggal, guru_id, guru_name, nama_kegiatan, deskripsi, video_url, upload_mode, layout, collage_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '')`
    );

    const result = insertDoc.run(
      tanggal,
      guru_id,
      guru_name,
      nama_kegiatan,
      deskripsi || '',
      video_url || '',
      mode,
      mode === 'single' ? 'grid-1x1' : (layout || 'grid-2x2')
    );

    const docId = result.lastInsertRowid as number;

    // Insert photos
    const insertFoto = db.prepare(
      'INSERT INTO foto (dokumentasi_id, foto_url, sort_order) VALUES (?, ?, ?)'
    );

    const insertPhotos = db.transaction((paths: string[]) => {
      paths.forEach((fotoPath: string, index: number) => {
        insertFoto.run(docId, fotoPath, index);
      });
    });

    insertPhotos(photosToUse);

    // Generate collage/single photo with text overlay
    const collageUrl = await generateCollage({
      imagePaths: photosToUse,
      layout: mode === 'single' ? 'grid-1x1' : ((layout || 'grid-2x2') as CollageLayout),
      documentId: docId,
      uploadMode: mode,
      namaKegiatan: nama_kegiatan || '',
      tanggal: tanggal,
      namaSekolah: SCHOOL_NAME,
    });

    // Update collage URL
    db.prepare('UPDATE dokumentasi SET collage_url = ? WHERE id = ?').run(collageUrl, docId);

    const dokumentasi = db.prepare('SELECT * FROM dokumentasi WHERE id = ?').get(docId) as Record<string, unknown>;
    const fotos = db.prepare('SELECT * FROM foto WHERE dokumentasi_id = ? ORDER BY sort_order').all(docId);

    return Response.json({
      success: true,
      data: { ...dokumentasi, fotos },
    }, { status: 201 });
  } catch (error) {
    console.error('Create dokumentasi error:', error);
    return Response.json(
      { success: false, error: safeError(error, 'Gagal menyimpan dokumentasi') },
      { status: 500 }
    );
  }
}
