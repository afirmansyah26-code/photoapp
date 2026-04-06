import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { resetDb, dbPath } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const role = request.headers.get('x-user-role');
    if (role !== 'superadmin') {
      return Response.json({ success: false, error: 'Hanya superadmin yang dapat melakukan restore' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('backup') as File | null;

    if (!file || file.size === 0) {
      return Response.json({ success: false, error: 'File backup kosong' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isZip = fileName.endsWith('.zip');
    const isSqlite = fileName.endsWith('.sqlite') || fileName.endsWith('.db');

    if (!isZip && !isSqlite) {
      return Response.json({ success: false, error: 'Format file harus .zip atau .sqlite' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`[Restore] Received file: ${file.name}, size: ${fileBuffer.length} bytes`);
    console.log(`[Restore] DB path: ${dbPath}`);

    // Ensure DB directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    if (isSqlite) {
      // Validate SQLite magic bytes: "SQLite format 3\0"
      if (fileBuffer.length < 16 || fileBuffer.toString('ascii', 0, 15) !== 'SQLite format 3') {
        return Response.json({ success: false, error: 'File bukan database SQLite yang valid' }, { status: 400 });
      }

      // Backup existing DB before overwrite
      const backupPath = dbPath + '.pre-restore.' + Date.now();
      if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, backupPath);

      // Remove WAL/SHM first
      for (const ext of ['-wal', '-shm']) {
        try { if (fs.existsSync(dbPath + ext)) fs.unlinkSync(dbPath + ext); } catch { /* */ }
      }
      fs.writeFileSync(dbPath, fileBuffer);
      console.log(`[Restore] Database restored directly: ${fileBuffer.length} bytes`);
    } else {
      // ZIP: extract and find database.sqlite
      const restoreDir = path.join(backupDir, 'restore-temp');
      if (fs.existsSync(restoreDir)) fs.rmSync(restoreDir, { recursive: true, force: true });
      fs.mkdirSync(restoreDir, { recursive: true });

      const zipPath = path.join(restoreDir, 'backup.zip');
      fs.writeFileSync(zipPath, fileBuffer);

      const extractDir = path.join(restoreDir, 'extracted');
      try {
        if (process.platform === 'win32') {
          execFileSync('powershell', [
            '-Command',
            `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`
          ], { timeout: 120000 });
        } else {
          fs.mkdirSync(extractDir, { recursive: true });
          execFileSync('unzip', ['-o', zipPath, '-d', extractDir], { timeout: 120000 });
        }
      } catch (err) {
        console.error('[Restore] Extract error:', err);
        fs.rmSync(restoreDir, { recursive: true, force: true });
        return Response.json({ success: false, error: 'Gagal mengekstrak zip' }, { status: 500 });
      }

      const dbFile = findFile(extractDir, 'database.sqlite');
      if (!dbFile) {
        fs.rmSync(restoreDir, { recursive: true, force: true });
        return Response.json({ success: false, error: 'database.sqlite tidak ditemukan di zip' }, { status: 400 });
      }

      // Backup existing DB before overwrite
      const backupPath = dbPath + '.pre-restore.' + Date.now();
      if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, backupPath);

      // Validate SQLite
      const dbFileBuffer = fs.readFileSync(dbFile);
      if (dbFileBuffer.length < 16 || dbFileBuffer.toString('ascii', 0, 15) !== 'SQLite format 3') {
        fs.rmSync(restoreDir, { recursive: true, force: true });
        return Response.json({ success: false, error: 'database.sqlite bukan database SQLite yang valid' }, { status: 400 });
      }

      for (const ext of ['-wal', '-shm']) {
        try { if (fs.existsSync(dbPath + ext)) fs.unlinkSync(dbPath + ext); } catch { /* */ }
      }
      fs.copyFileSync(dbFile, dbPath);
      console.log('[Restore] Database restored from ZIP');

      // Also restore uploads if present in zip
      const uploadsFolder = findFolder(extractDir, 'uploads');
      if (uploadsFolder) {
        const destUploads = path.resolve(process.cwd(), 'public', 'uploads');
        if (fs.existsSync(destUploads)) {
          fs.rmSync(destUploads, { recursive: true, force: true });
        }
        copyFolderRecursive(uploadsFolder, destUploads);
        console.log('[Restore] Uploads folder restored');
      }

      fs.rmSync(restoreDir, { recursive: true, force: true });
    }

    // Reset DB connection so app uses the restored database
    resetDb();

    // After restore: recover files from trash
    const recoveredCount = recoverFilesFromTrash();

    return Response.json({
      success: true,
      message: `Restore berhasil diterapkan.${recoveredCount > 0 ? ` ${recoveredCount} file dipulihkan dari sampah.` : ''} Refresh halaman untuk melihat perubahan.`,
    });
  } catch (error) {
    console.error('[Restore] Error:', error);
    return Response.json({ success: false, error: 'Gagal restore: ' + (error as Error).message }, { status: 500 });
  }
}

function recoverFilesFromTrash(): number {
  let recoveredCount = 0;
  try {
    const Database = require('better-sqlite3');
    const tempDb = new Database(dbPath, { readonly: true });

    const trashDir = path.resolve(process.cwd(), 'public', 'uploads', 'trash');
    if (!fs.existsSync(trashDir)) {
      tempDb.close();
      return 0;
    }

    let hasDeletedAt = false;
    try {
      tempDb.prepare("SELECT deleted_at FROM dokumentasi LIMIT 0").run();
      hasDeletedAt = true;
    } catch { /* column doesn't exist in old backups */ }

    const fotoQuery = hasDeletedAt
      ? 'SELECT f.foto_url FROM foto f JOIN dokumentasi d ON f.dokumentasi_id = d.id WHERE d.deleted_at IS NULL'
      : 'SELECT foto_url FROM foto';
    const fotos = tempDb.prepare(fotoQuery).all() as { foto_url: string }[];

    const collageQuery = hasDeletedAt
      ? "SELECT collage_url FROM dokumentasi WHERE collage_url != '' AND deleted_at IS NULL"
      : "SELECT collage_url FROM dokumentasi WHERE collage_url != ''";
    const collages = tempDb.prepare(collageQuery).all() as { collage_url: string }[];

    tempDb.close();

    const allUrls = [
      ...fotos.map(f => f.foto_url),
      ...collages.map(c => c.collage_url),
    ];

    for (const fileUrl of allUrls) {
      const relativePath = fileUrl.replace(/^\/?(uploads\/)?/, '');
      const originalPath = path.join(process.cwd(), 'public', 'uploads', relativePath);
      const trashPath = path.join(trashDir, relativePath);

      if (!fs.existsSync(originalPath) && fs.existsSync(trashPath)) {
        const dir = path.dirname(originalPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.renameSync(trashPath, originalPath);
        recoveredCount++;
      }
    }

    if (recoveredCount > 0) {
      console.log(`[Restore] Recovered ${recoveredCount} files from trash`);
    }
  } catch (err) {
    console.error('[Restore] Error recovering files from trash:', err);
  }
  return recoveredCount;
}

function findFile(dir: string, filename: string): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name === filename) return p;
    if (e.isDirectory()) { const f = findFile(p, filename); if (f) return f; }
  }
  return null;
}

function findFolder(dir: string, name: string): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === name) return p;
      const f = findFolder(p, name); if (f) return f;
    }
  }
  return null;
}

function copyFolderRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    e.isDirectory() ? copyFolderRecursive(s, d) : fs.copyFileSync(s, d);
  }
}
