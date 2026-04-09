import db from '@/lib/db';

export async function GET() {
  try {
    const totalDokumentasi = db
      .prepare('SELECT COUNT(*) as count FROM dokumentasi WHERE deleted_at IS NULL')
      .get() as { count: number };

    const totalFoto = db
      .prepare(`
        SELECT COUNT(*) as count FROM foto f
        JOIN dokumentasi d ON f.dokumentasi_id = d.id
        WHERE d.deleted_at IS NULL
      `)
      .get() as { count: number };

    // Current month
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const bulanIni = db
      .prepare(`
        SELECT COUNT(*) as count FROM dokumentasi
        WHERE deleted_at IS NULL AND tanggal LIKE ?
      `)
      .get(`${yearMonth}%`) as { count: number };

    // Total guru (users with role 'guru')
    const totalGuru = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'guru'")
      .get() as { count: number };

    return Response.json({
      success: true,
      data: {
        totalDokumentasi: totalDokumentasi.count,
        totalFoto: totalFoto.count,
        bulanIni: bulanIni.count,
        totalGuru: totalGuru.count,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return Response.json(
      { success: false, error: 'Gagal mengambil statistik' },
      { status: 500 }
    );
  }
}
