import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import db from '@/lib/db';

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'database.sqlite');

// GET /api/backup?type=db  → download database only
// GET /api/backup?type=full → download database + uploads as zip
export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role');
    if (role !== 'admin' && role !== 'superadmin' && role !== 'kepsek') {
      return Response.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }

    const type = request.nextUrl.searchParams.get('type') || 'db';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // Checkpoint WAL to flush all pending changes
    db.pragma('wal_checkpoint(TRUNCATE)');

    if (type === 'db') {
      const dbBuffer = fs.readFileSync(dbPath);
      return new NextResponse(dbBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="backup-kolase-${timestamp}.sqlite"`,
        },
      });
    }

    // Full backup: zip database + uploads
    const uploadsPath = path.resolve(process.cwd(), 'public', 'uploads');
    const backupName = `backup-kolase-${timestamp}`;
    const backupFolder = path.join(backupDir, backupName);
    fs.mkdirSync(backupFolder, { recursive: true });

    fs.copyFileSync(dbPath, path.join(backupFolder, 'database.sqlite'));

    if (fs.existsSync(uploadsPath)) {
      copyFolderRecursive(uploadsPath, path.join(backupFolder, 'uploads'));
    }

    const zipPath = `${backupFolder}.zip`;

    try {
      if (process.platform === 'win32') {
        execFileSync('powershell', [
          '-Command',
          `Compress-Archive -Path '${backupFolder}\\*' -DestinationPath '${zipPath}' -Force`
        ], { timeout: 120000 });
      } else {
        execFileSync('zip', ['-r', zipPath, '.'], {
          cwd: backupFolder,
          timeout: 120000,
        });
      }
    } catch {
      deleteFolderRecursive(backupFolder);
      // Fallback: return database only
      const dbBuffer = fs.readFileSync(dbPath);
      return new NextResponse(dbBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${backupName}.sqlite"`,
        },
      });
    }

    const zipBuffer = fs.readFileSync(zipPath);
    deleteFolderRecursive(backupFolder);
    try { fs.unlinkSync(zipPath); } catch { /* ignore */ }

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${backupName}.zip"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json(
      { success: false, error: 'Gagal membuat backup: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

function copyFolderRecursive(src: string, dest: string) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dest, entry.name);
    entry.isDirectory() ? copyFolderRecursive(s, d) : fs.copyFileSync(s, d);
  }
}

function deleteFolderRecursive(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}
