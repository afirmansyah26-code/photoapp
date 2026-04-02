const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
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
    layout TEXT NOT NULL DEFAULT 'grid-2x2',
    collage_url TEXT NOT NULL DEFAULT '',
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

// Migration: add nama_kegiatan if missing
try {
  db.prepare("SELECT nama_kegiatan FROM dokumentasi LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE dokumentasi ADD COLUMN nama_kegiatan TEXT NOT NULL DEFAULT ''");
}

// Ensure upload directories exist
const dirs = [
  path.join(process.cwd(), 'public', 'uploads'),
  path.join(process.cwd(), 'public', 'uploads', 'originals'),
  path.join(process.cwd(), 'public', 'uploads', 'collages'),
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Seed users
const users = [
  { username: 'admin', password: 'admin123', name: 'Administrator', role: 'superadmin' },
  { username: 'guru1', password: 'guru123', name: 'Ibu Sari', role: 'guru' },
  { username: 'guru2', password: 'guru123', name: 'Bapak Anto', role: 'guru' },
  { username: 'guru3', password: 'guru123', name: 'Ibu Dewi', role: 'guru' },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)'
);

const seedUsers = db.transaction(() => {
  users.forEach(user => {
    const hashed = bcrypt.hashSync(user.password, 10);
    insertUser.run(user.username, hashed, user.name, user.role);
  });
});

seedUsers();

console.log('✅ Database seeded successfully!');
console.log('');
console.log('Default accounts:');
users.forEach(u => {
  console.log(`  ${u.role.padEnd(14)} | username: ${u.username.padEnd(8)} | password: ${u.password}`);
});
console.log('');

db.close();
