'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useUser } from '../layout';
import Link from 'next/link';

interface TrashItem {
  id: number;
  tanggal: string;
  guru_name: string;
  nama_kegiatan: string;
  collage_url: string;
  foto_count: number;
  deleted_at: string;
}

export default function SampahPage() {
  const user = useUser();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<'single' | 'bulk' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const fetchTrash = useCallback(async () => {
    try {
      const res = await fetch('/api/trash');
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items);
        setTotalSize(data.data.totalSize);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const selectMode = selected.size > 0;

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const handleRestore = async (ids: number[]) => {
    setProcessing(true);
    try {
      let count = 0;
      for (const id of ids) {
        const res = await fetch(`/api/trash/${id}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) count++;
      }
      toast.success(`${count} dokumentasi dipulihkan`);
      setSelected(new Set());
      fetchTrash();
    } catch { toast.error('Gagal memulihkan'); }
    finally { setProcessing(false); }
  };

  const handleDeleteForever = async (ids: number[]) => {
    setProcessing(true);
    try {
      let count = 0;
      for (const id of ids) {
        const res = await fetch(`/api/trash/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) count++;
      }
      toast.success(`${count} dokumentasi dihapus permanen`);
      setSelected(new Set());
      setShowDeleteModal(null);
      setDeleteTargetId(null);
      fetchTrash();
    } catch { toast.error('Gagal menghapus'); }
    finally { setProcessing(false); }
  };

  const handleEmptyTrash = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/trash', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Sampah berhasil dikosongkan');
        setItems([]);
        setTotalSize(0);
        setShowEmptyModal(false);
      } else {
        toast.error(data.error || 'Gagal mengosongkan sampah');
      }
    } catch { toast.error('Gagal mengosongkan sampah'); }
    finally { setProcessing(false); }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const daysUntilDelete = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton h-52 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-text flex items-center gap-2">
              <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Folder Sampah
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {items.length} item • {formatFileSize(totalSize)} • Otomatis terhapus setelah 30 hari
            </p>
          </div>
          {items.length > 0 && (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'kepsek') && (
            <button
              onClick={() => setShowEmptyModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Kosongkan Semua
            </button>
          )}
        </div>

        {/* Selection bar */}
        {selectMode && (
          <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-sm font-medium text-primary-700 hover:text-primary-800">
                {selected.size === items.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
              <span className="text-sm text-primary-600">{selected.size} dipilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-1.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-white transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleRestore(Array.from(selected))}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 bg-white border border-primary-200 rounded-xl hover:bg-primary-50 disabled:opacity-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Pulihkan Terpilih
              </button>
              <button
                onClick={() => setShowDeleteModal('bulk')}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Hapus Permanen Terpilih
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 && (
          <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-dim rounded-2xl mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text mb-1">Sampah Kosong</h3>
            <p className="text-sm text-text-secondary mb-4">Tidak ada dokumentasi di folder sampah</p>
            <Link
              href="/dashboard/dokumentasi"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors"
            >
              Kembali ke Dokumentasi
            </Link>
          </div>
        )}

        {/* Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 stagger-children">
            {items.map((item) => {
              const remaining = daysUntilDelete(item.deleted_at);
              return (
                <div key={item.id} className="relative group">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleSelect(item.id, e)}
                    className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      selected.has(item.id)
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-white/80 bg-black/20 text-transparent opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>

                  <div className={`bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all duration-300 ${
                    selected.has(item.id) ? 'border-primary-400 ring-2 ring-primary-200' : 'border-border'
                  }`}>
                    <div className="aspect-square bg-surface-dim relative overflow-hidden">
                      {item.collage_url ? (
                        <img
                          src={item.collage_url.replace('/uploads/', '/uploads/trash/')}
                          alt={item.nama_kegiatan}
                          className="w-full h-full object-cover opacity-70"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-text-muted opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* Badge */}
                      <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-lg font-medium ${
                        remaining <= 7 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {remaining} hari
                      </div>
                    </div>
                    <div className="p-2.5">
                      <h3 className="text-xs font-semibold text-text truncate">{item.nama_kegiatan}</h3>
                      <p className="text-xs text-text-muted mt-0.5 truncate">{item.guru_name} • {item.foto_count} foto</p>
                      <p className="text-xs text-text-muted mt-0.5">Dihapus {formatDate(item.deleted_at)}</p>
                      {/* Actions */}
                      {!selectMode && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <button
                            onClick={() => handleRestore([item.id])}
                            disabled={processing}
                            className="flex-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg py-1.5 hover:bg-primary-100 disabled:opacity-50 transition-colors"
                          >
                            Pulihkan
                          </button>
                          <button
                            onClick={() => { setDeleteTargetId(item.id); setShowDeleteModal('single'); }}
                            className="flex-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg py-1.5 hover:bg-red-100 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete forever modal */}
      {showDeleteModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-[20vh] p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scale-in shadow-2xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text mb-1">Hapus Permanen?</h3>
              <p className="text-sm text-text-secondary mb-5">
                {showDeleteModal === 'bulk' ? `${selected.size} dokumentasi` : '1 dokumentasi'} akan dihapus selamanya. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(null); setDeleteTargetId(null); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-dim transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteForever(
                    showDeleteModal === 'bulk' ? Array.from(selected) : deleteTargetId ? [deleteTargetId] : []
                  )}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {processing ? 'Menghapus...' : 'Hapus Selamanya'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Empty all modal */}
      {showEmptyModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-[20vh] p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scale-in shadow-2xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text mb-1">Kosongkan Sampah?</h3>
              <p className="text-sm text-text-secondary mb-2">
                {items.length} dokumentasi ({formatFileSize(totalSize)})
              </p>
              <p className="text-xs text-danger font-medium mb-5">
                ⚠️ Semua item akan dihapus selamanya dan tidak bisa dipulihkan!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEmptyModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-dim transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleEmptyTrash}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {processing ? 'Menghapus...' : 'Kosongkan'}
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
