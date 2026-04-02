'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface DocItem {
  id: number;
  tanggal: string;
  guru_name: string;
  nama_kegiatan: string;
  deskripsi: string;
  collage_url: string;
  foto_count: number;
}

interface GuruOption {
  id: number;
  name: string;
}

export default function GalleryPage() {
  const [items, setItems] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [guruList, setGuruList] = useState<GuruOption[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filterGuru, setFilterGuru] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setGuruList(data.data
            .filter((u: { role: string }) => u.role === 'guru')
            .map((u: { id: number; name: string }) => ({ id: u.id, name: u.name })));
        }
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterGuru) params.set('guru', filterGuru);
      if (filterTanggal) params.set('tanggal', filterTanggal);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/dokumentasi?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterGuru, filterTanggal, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetFilters = () => {
    setFilterGuru('');
    setFilterTanggal('');
    setSearchQuery('');
    setPage(1);
  };

  const hasFilters = filterGuru || filterTanggal || searchQuery;
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

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      let successCount = 0;
      for (const id of selected) {
        const res = await fetch(`/api/dokumentasi/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) successCount++;
      }
      toast.success(`${successCount} dokumentasi dipindahkan ke sampah`);
      setSelected(new Set());
      fetchData();
    } catch {
      toast.error('Gagal menghapus');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Galeri Dokumentasi</h1>
          <p className="text-sm text-text-secondary">{total} dokumentasi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Cari</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Cari kegiatan..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Guru</label>
            <select
              value={filterGuru}
              onChange={(e) => { setFilterGuru(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Semua Guru</option>
              {guruList.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Tanggal</label>
            <input
              type="date"
              value={filterTanggal}
              onChange={(e) => { setFilterTanggal(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm text-danger hover:text-danger-light font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset filter
          </button>
        )}
      </div>

      {/* Selection bar */}
      {selectMode && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-sm font-medium text-primary-700 hover:text-primary-800"
            >
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
              onClick={handleBulkDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? 'Memindahkan...' : 'Pindahkan ke Sampah'}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-52 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-dim rounded-2xl mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="font-semibold text-text mb-1">
            {hasFilters ? 'Tidak ada hasil' : 'Belum ada dokumentasi'}
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            {hasFilters ? 'Coba ubah filter pencarian' : 'Mulai tambahkan dokumentasi pertama'}
          </p>
          {!hasFilters && (
            <Link
              href="/dashboard/dokumentasi/baru"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Dokumentasi
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 stagger-children">
            {items.map((doc) => (
              <div key={doc.id} className="relative group">
                {/* Checkbox */}
                <button
                  onClick={(e) => toggleSelect(doc.id, e)}
                  className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    selected.has(doc.id)
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-white/80 bg-black/20 text-transparent opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>

                <Link
                  href={`/dashboard/dokumentasi/${doc.id}`}
                  className={`block bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all duration-300 ${
                    selected.has(doc.id) ? 'border-primary-400 ring-2 ring-primary-200' : 'border-border hover:border-primary-200'
                  }`}
                >
                  <div className="aspect-square bg-surface-dim relative overflow-hidden">
                    {doc.collage_url ? (
                      <img
                        src={doc.collage_url}
                        alt={`Kolase ${doc.nama_kegiatan}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                      {doc.foto_count}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-text-muted">{formatDate(doc.tanggal)}</span>
                    </div>
                    <h3 className="font-semibold text-text text-xs group-hover:text-primary-700 transition-colors truncate">
                      {doc.nama_kegiatan || 'Dokumentasi'}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{doc.guru_name}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>
              <span className="px-4 py-2 text-sm text-text-secondary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
