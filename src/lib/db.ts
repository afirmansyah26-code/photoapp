import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Support Docker volume: DB_PATH env var or default to project root
const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'database.sqlite');

let _db: ReturnType<typeof Database> | null = null;
let _initialized = false;

function getDb(): ReturnType<typeof Database> {
  if (_db) return _db;

  // Legacy: Check for pending restore BEFORE opening the database
  const pendingRestore = path.resolve(process.cwd(), 'backups', 'restore-pending.sqlite');
  if (fs.existsSync(pendingRestore)) {
    try {
      for (const ext of ['-wal', '-shm']) {
        try { if (fs.existsSync(dbPath + ext)) fs.unlinkSync(dbPath + ext); } catch { /* */ }
      }
      fs.copyFileSync(pendingRestore, dbPath);
      fs.unlinkSync(pendingRestore);
      console.log('[DB] Pending restore applied successfully');
    } catch (err) {
      console.error('[DB] Failed to apply pending restore:', err);
    }
  }

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'guru' CHECK(role IN ('superadmin', 'admin', 'kepsek', 'guru')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dokumentasi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      guru_id INTEGER NOT NULL,
      guru_name TEXT NOT NULL,
      nama_kegiatan TEXT NOT NULL DEFAULT '',
      deskripsi TEXT NOT NULL DEFAULT '',
      upload_mode TEXT NOT NULL DEFAULT 'collage' CHECK(upload_mode IN ('single', 'collage')),
      layout TEXT NOT NULL DEFAULT 'grid-2x2',
      collage_url TEXT NOT NULL DEFAULT '',
      deleted_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (guru_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS foto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dokumentasi_id INTEGER NOT NULL,
      foto_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (dokumentasi_id) REFERENCES dokumentasi(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_dokumentasi_tanggal ON dokumentasi(tanggal);
    CREATE INDEX IF NOT EXISTS idx_dokumentasi_guru_id ON dokumentasi(guru_id);
    CREATE INDEX IF NOT EXISTS idx_foto_dokumentasi_id ON foto(dokumentasi_id);
  `);

  // Run migrations only once
  if (!_initialized) {
    _initialized = true;
    runMigrations(_db);
    runStartupTasks(_db);
  }

  return _db;
}

function runMigrations(db: ReturnType<typeof Database>) {
  // Migration: add nama_kegiatan if it doesn't exist
  try {
    db.prepare("SELECT nama_kegiatan FROM dokumentasi LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE dokumentasi ADD COLUMN nama_kegiatan TEXT NOT NULL DEFAULT ''");
  }

  // Migration: add deleted_at column if it doesn't exist
  try {
    db.prepare("SELECT deleted_at FROM dokumentasi LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE dokumentasi ADD COLUMN deleted_at TEXT DEFAULT NULL");
  }

  // Migration: add upload_mode column if it doesn't exist
  try {
    db.prepare("SELECT upload_mode FROM dokumentasi LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE dokumentasi ADD COLUMN upload_mode TEXT NOT NULL DEFAULT 'collage'");
  }

  // Migration: update CHECK constraint to include 'kepsek' role
  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql: string } | undefined;
    if (tableInfo && !tableInfo.sql.includes('kepsek')) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'guru' CHECK(role IN ('superadmin', 'admin', 'kepsek', 'guru')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO users_new SELECT * FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      db.pragma('foreign_keys = ON');
      console.log('[DB] Migrated users table to include kepsek role');
    }
  } catch (err) {
    db.pragma('foreign_keys = ON');
    console.error('[DB] Error migrating kepsek role:', err);
  }
}

function runStartupTasks(db: ReturnType<typeof Database>) {
  // Auto-cleanup items in trash older than 30 days
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const expiredDocs = db.prepare(
      'SELECT id, collage_url FROM dokumentasi WHERE deleted_at IS NOT NULL AND deleted_at < ?'
    ).all(thirtyDaysAgo) as { id: number; collage_url: string }[];

    if (expiredDocs.length > 0) {
      const trashDir = path.resolve(process.cwd(), 'public', 'uploads', 'trash');

      for (const doc of expiredDocs) {
        const fotos = db.prepare('SELECT foto_url FROM foto WHERE dokumentasi_id = ?').all(doc.id) as { foto_url: string }[];
        const allUrls = [...fotos.map(f => f.foto_url), doc.collage_url].filter(Boolean);

        for (const fileUrl of allUrls) {
          const relativePath = fileUrl.replace(/^\/?(uploads\/)?/, '');
          const trashPath = path.join(trashDir, relativePath);
          try { if (fs.existsSync(trashPath)) fs.unlinkSync(trashPath); } catch { /* */ }
        }

        db.prepare('DELETE FROM dokumentasi WHERE id = ?').run(doc.id);
      }

      console.log(`[DB] Auto-cleaned ${expiredDocs.length} expired trash items (>30 days)`);
    }
  } catch (err) {
    console.error('[DB] Error during auto-cleanup:', err);
  }

  // Recover files from trash for active dokumentasi records
  try {
    const trashDir = path.resolve(process.cwd(), 'public', 'uploads', 'trash');
    if (fs.existsSync(trashDir)) {
      let recoveredCount = 0;

      const fotos = db.prepare(
        'SELECT f.foto_url FROM foto f JOIN dokumentasi d ON f.dokumentasi_id = d.id WHERE d.deleted_at IS NULL'
      ).all() as { foto_url: string }[];
      const collages = db.prepare(
        "SELECT collage_url FROM dokumentasi WHERE collage_url != '' AND deleted_at IS NULL"
      ).all() as { collage_url: string }[];

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
        console.log(`[DB] Recovered ${recoveredCount} files from trash`);
      }
    }
  } catch (err) {
    console.error('[DB] Error recovering files from trash:', err);
  }
}

// Reset DB connection — call after restore to pick up new database file
export function resetDb() {
  if (_db) {
    try { _db.close(); } catch { /* */ }
    _db = null;
    _initialized = false;
    console.log('[DB] Connection reset — will reinitialize on next access');
  }
}

export { dbPath };

// Use Proxy so `db.prepare(...)` works seamlessly — lazy init on first access
const db = new Proxy({} as ReturnType<typeof Database>, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export default db;
