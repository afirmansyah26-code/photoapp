import db from '@/lib/db';
import { generateCollage } from '@/lib/collage';
import type { CollageLayout } from '@/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { layout } = await request.json();

    const dokumentasi = db
      .prepare('SELECT * FROM dokumentasi WHERE id = ?')
      .get(id) as { id: number } | undefined;

    if (!dokumentasi) {
      return Response.json(
        { success: false, error: 'Dokumentasi tidak ditemukan' },
        { status: 404 }
      );
    }

    const fotos = db
      .prepare('SELECT * FROM foto WHERE dokumentasi_id = ? ORDER BY sort_order')
      .all(id) as { foto_url: string }[];

    const photoPaths = fotos.map((f) => f.foto_url);

    const collageUrl = await generateCollage({
      imagePaths: photoPaths,
      layout: (layout || 'grid-2x2') as CollageLayout,
      documentId: dokumentasi.id,
    });

    db.prepare('UPDATE dokumentasi SET collage_url = ?, layout = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(collageUrl, layout || 'grid-2x2', id);

    return Response.json({
      success: true,
      data: { collage_url: collageUrl },
    });
  } catch (error) {
    console.error('Regenerate collage error:', error);
    return Response.json(
      { success: false, error: 'Gagal membuat ulang kolase' },
      { status: 500 }
    );
  }
}
