'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useUser, useSettings } from '../layout';
import { useRouter } from 'next/navigation';

export default function PengaturanPage() {
  const user = useUser();
  const currentSettings = useSettings();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appName, setAppName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const [backingUp, setBackingUp] = useState<'db' | 'full' | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (user && user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'kepsek') {
    router.push('/dashboard');
    return null;
  }

  // Sync form state when settings load
  useEffect(() => {
    if (currentSettings.app_name) setAppName(currentSettings.app_name);
    if (currentSettings.school_name) setSchoolName(currentSettings.school_name);
  }, [currentSettings]);

  const handleSaveSettings = async () => {
    if (!appName.trim()) {
      toast.error('Nama aplikasi harus diisi');
      return;
    }
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_name: appName.trim(), school_name: schoolName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pengaturan berhasil disimpan. Refresh halaman untuk melihat perubahan.');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(data.error || 'Gagal menyimpan');
      }
    } catch {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBackup = async (type: 'db' | 'full') => {
    setBackingUp(type);
    try {
      const res = await fetch(`/api/backup?type=${type}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Gagal membuat backup');
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] || `backup-kolase.${type === 'full' ? 'zip' : 'sqlite'}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup berhasil didownload!');
    } catch (err) {
      toast.error((err as Error).message || 'Gagal membuat backup');
    } finally {
      setBackingUp(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const name = file.name.toLowerCase();
      if (!name.endsWith('.zip') && !name.endsWith('.sqlite') && !name.endsWith('.db')) {
        toast.error('Format file harus .zip atau .sqlite');
        return;
      }
      setSelectedFile(file);
      setShowRestoreModal(true);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) return;

    setRestoring(true);
    try {
      // Use FormData — same proven pattern as /api/upload
      const formData = new FormData();
      formData.append('backup', selectedFile);

      const res = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Restore berhasil diterapkan!', { duration: 5000 });
        setShowRestoreModal(false);
        setSelectedFile(null);
        // Reload the page to reflect restored data
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(data.error || 'Gagal restore');
      }
    } catch (err) {
      toast.error((err as Error).message || 'Gagal restore');
    } finally {
      setRestoring(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text">Pengaturan</h1>
          <p className="text-sm text-text-secondary">Kelola pengaturan aplikasi, backup dan restore</p>
        </div>

        {/* App Settings Section */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-text mb-1">Identitas Aplikasi</h2>
              <p className="text-sm text-text-secondary mb-4">Nama aplikasi dan nama sekolah akan tampil di sidebar, login, dan header kolase</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Nama Aplikasi</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={e => setAppName(e.target.value)}
                    placeholder="Contoh: Kolase Pembelajaran"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Nama Sekolah</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    placeholder="Contoh: SLB BCD Nusantara"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-text-muted mt-1">Nama sekolah juga tampil pada header kolase foto</p>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-md shadow-primary-500/20"
              >
                {savingSettings ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Menyimpan...
                  </>
                ) : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        </div>

        {/* Backup Section */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-text mb-1">Backup Database</h2>
              <p className="text-sm text-text-secondary mb-4">
                Download data untuk keperluan pemulihan. Pilih sesuai kebutuhan:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* DB Only */}
                <button
                  onClick={() => handleBackup('db')}
                  disabled={backingUp !== null}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-border rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-center group"
                >
                  {backingUp === 'db' ? (
                    <svg className="w-8 h-8 text-emerald-500 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-text">Database Saja</p>
                    <p className="text-xs text-text-muted mt-0.5">File .sqlite — cepat & ringan</p>
                  </div>
                </button>

                {/* Full Backup */}
                <button
                  onClick={() => handleBackup('full')}
                  disabled={backingUp !== null}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-border rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-center group"
                >
                  {backingUp === 'full' ? (
                    <svg className="w-8 h-8 text-emerald-500 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-text">Lengkap + Foto</p>
                    <p className="text-xs text-text-muted mt-0.5">File .zip — database & semua foto</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Restore Section */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0L13 8m4-4v12" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-text mb-1">Restore Database</h2>
              <p className="text-sm text-text-secondary mb-3">
                Pulihkan data dari file backup. File yang didukung:
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  .sqlite
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  .zip (backup lengkap)
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <div className="flex gap-2">
                  <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-xs text-amber-800">
                    <strong>Peringatan:</strong> Restore akan menggantikan seluruh data yang ada saat ini.
                    Pastikan Anda telah membuat backup terlebih dahulu.
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.sqlite,.db"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0L13 8m4-4v12" />
                </svg>
                Pilih File Backup
              </button>
            </div>
          </div>
        </div>


        {/* Info Section */}
        <div className="bg-surface-dim rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Informasi
          </h3>
          <ul className="space-y-2 text-xs text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">●</span>
              <strong>Database Saja</strong> — backup data tanpa foto. Saat restore, foto yang di-sampah otomatis dikembalikan.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">●</span>
              <strong>Lengkap + Foto</strong> — backup data dan semua foto dalam file ZIP. Lebih besar tapi lengkap.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">●</span>
              <strong>Sampah</strong> — foto yang dihapus masuk ke sampah dan bisa dikembalikan saat restore database.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">●</span>
              Disarankan backup rutin minimal 1x per minggu
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">●</span>
              Simpan file backup di perangkat lain atau cloud storage
            </li>
          </ul>
        </div>
      </div>

      {/* Restore confirmation modal */}
      {showRestoreModal && selectedFile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-[18vh] p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-scale-in shadow-2xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 rounded-2xl mb-4">
                <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text mb-1">Konfirmasi Restore</h3>
              <p className="text-sm text-text-secondary mb-2">
                Anda akan merestore database dari file:
              </p>
              <div className="bg-surface-dim rounded-xl p-3 mb-4 text-left">
                <p className="text-sm font-medium text-text truncate">{selectedFile.name}</p>
                <p className="text-xs text-text-muted">{formatFileSize(selectedFile.size)}</p>
              </div>
              <p className="text-xs text-danger font-medium mb-5">
                ⚠️ Seluruh data saat ini akan digantikan dengan data dari backup ini.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRestoreModal(false); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-dim transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleRestore}
                  disabled={restoring}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {restoring ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Merestore...
                    </span>
                  ) : 'Ya, Restore'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
