# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 1. Nama Produk

Kolase Pembelajaran SLB Nusantara

## 2. Latar Belakang

Guru di SLB BCD Nusantara membutuhkan cara yang mudah untuk mendokumentasikan kegiatan pembelajaran dalam bentuk foto kolase sebagai bukti kegiatan, laporan, dan arsip sekolah.

Saat ini dokumentasi masih tersebar (WhatsApp, galeri pribadi), sehingga:

- Sulit dicari kembali
- Tidak terstruktur
- Tidak seragam formatnya

Aplikasi ini dibuat untuk menyederhanakan proses dokumentasi pembelajaran berbasis foto kolase.

---

## 3. Tujuan Produk

- Memudahkan guru menyimpan dokumentasi pembelajaran
- Membuat kolase foto secara otomatis
- Menyediakan arsip terpusat
- Mempermudah pelaporan kegiatan

---

## 4. Target Pengguna

- Guru SLB BCD Nusantara
- Kepala sekolah (monitoring)
- Admin sekolah

---

## 5. Fitur Utama

### 5.1 Autentikasi

- Login sederhana (email / username)
- Role:
  - Admin
  - Guru

### 5.2 Upload Foto

- Upload multiple foto (max 10)
- Kompresi otomatis
- Preview sebelum simpan

### 5.3 Generator Kolase

- Pilihan layout:
  - Grid (2x2, 3x3)
  - Horizontal
  - Vertikal
- Otomatis generate kolase dari foto yang diupload

### 5.4 Data Dokumentasi

Form input:

- Tanggal
- Nama guru
- Kelas
- Mata pelajaran
- Deskripsi kegiatan

### 5.5 Galeri Dokumentasi

- List semua dokumentasi
- Filter:
  - Tanggal
  - Guru
  - Kelas
- Tampilan grid

### 5.6 Detail Dokumentasi

- Menampilkan:
  - Kolase
  - Foto asli
  - Informasi kegiatan

### 5.7 Export

- Download kolase sebagai:
  - JPG
  - PDF sederhana

---

## 6. Non-Functional Requirements

### 6.1 Performance

- Upload < 3 detik per foto
- Generate kolase < 2 detik

### 6.2 Usability

- UI sederhana (ramah guru non-teknis)
- Mobile friendly

### 6.3 Storage

- Penyimpanan lokal server / cloud (opsional)

---

## 7. Teknologi yang Digunakan

### Frontend

- Next.js
- Tailwind CSS

### Backend

- Node.js / Express / Next API

### Database

- PostgreSQL / SQLite

### Storage

- Local storage / S3 compatible

---

## 8. Struktur Database (Sederhana)

### Users

- id
- name
- email
- role

### Dokumentasi

- id
- tanggal
- guru
- kelas
- mapel
- deskripsi
- kolase_url

### Foto

- id
- dokumentasi_id
- foto_url

---

## 9. User Flow

1. Login
2. Klik "Tambah Dokumentasi"
3. Upload foto
4. Isi data kegiatan
5. Generate kolase
6. Simpan
7. Lihat di galeri

---

## 10. UI Halaman

- Login Page
- Dashboard
- Tambah Dokumentasi
- Galeri
- Detail Dokumentasi

---

## 11. MVP Scope

Versi awal cukup:

- Login sederhana
- Upload foto
- Generate kolase
- Simpan & tampilkan galeri

Tanpa:

- Role kompleks
- Integrasi cloud
- Export PDF advanced

---

## 12. Future Development

- Integrasi Google Drive
- AI auto-caption kegiatan
- Template laporan otomatis
- Multi sekolah support

---

## 13. Success Metrics

- 90% guru menggunakan aplikasi
- Dokumentasi tersimpan rapi
- Waktu dokumentasi berkurang >50%

---

## 14. Catatan Khusus

- Harus sangat sederhana (low tech user)
- Fokus ke kecepatan dan kemudahan
- Bisa dijalankan di server lokal sekolah
