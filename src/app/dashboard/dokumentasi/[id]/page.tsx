'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useUser } from '../../layout';

interface Foto {
  id: number;
  foto_url: string;
  sort_order: number;
}

interface DokumentasiDetail {
  id: number;
  tanggal: string;
  guru_id: number;
  guru_name: string;
  nama_kegiatan: string;
  deskripsi: string;
  video_url: string;
  upload_mode: string;
  layout: string;
  collage_url: string;
  fotos: Foto[];
}

export default function DetailDokumentasiPage() {
  const router = useRouter();
  const params = useParams();
  const user = useUser();
  const id = params.id as string;

  const [doc, setDoc] = useState<DokumentasiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);

  const canDelete = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'kepsek' || (user?.role === 'guru' && doc?.guru_id === user?.userId);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/dokumentasi/${id}`);
      const data = await res.json();
      if (data.success) {
        setDoc(data.data);
      } else {
        toast.error('Dokumentasi tidak ditemukan');
        router.push('/dashboard/dokumentasi');
      }
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/dokumentasi/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Dokumentasi berhasil dihapus');
        router.push('/dashboard/dokumentasi');
      } else {
        toast.error(data.error || 'Gagal menghapus');
      }
    } catch {
      toast.error('Gagal menghapus');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDownloadCollage = async () => {
    if (!doc?.collage_url) return;
    try {
      const res = await fetch(doc.collage_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kolase-${doc.nama_kegiatan || 'dokumentasi'}-${doc.tanggal}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Kolase berhasil didownload');
    } catch {
      toast.error('Gagal mendownload kolase');
    }
  };

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-96 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="text-sm text-text-secondary hover:text-text flex items-center gap-1 mb-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </button>
            <h1 className="text-xl font-bold text-text">{doc.nama_kegiatan || 'Dokumentasi'}</h1>
            <p className="text-sm text-text-secondary">{doc.guru_name} • {formatDate(doc.tanggal)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCollage}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-light transition-colors shadow-md shadow-accent/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-danger/30 text-danger text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus
              </button>
            )}
          </div>
        </div>

        {/* Collage */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden mb-6 shadow-sm">
          {doc.collage_url && (
            <div className="relative">
              <img
                src={doc.collage_url}
                alt="Kolase"
                className="w-full object-contain max-h-[600px]"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                {doc.upload_mode === 'single' ? '📷 1 Foto' : `🖼️ Kolase • ${doc.layout}`}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-text mb-4">Informasi Kegiatan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted font-medium">Nama Kegiatan</p>
                <p className="text-sm text-text font-semibold">{doc.nama_kegiatan}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted font-medium">Tanggal</p>
                <p className="text-sm text-text font-medium">{formatDate(doc.tanggal)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted font-medium">Guru</p>
                <p className="text-sm text-text font-medium">{doc.guru_name}</p>
              </div>
            </div>
          </div>
          {doc.deskripsi && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-text-muted font-medium mb-1">Deskripsi Kegiatan</p>
              <p className="text-sm text-text leading-relaxed">{doc.deskripsi}</p>
            </div>
          )}
          {doc.video_url && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                  <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white"/>
                </svg>
                <p className="text-xs text-text-muted font-medium">Video Kegiatan</p>
              </div>
              {(() => {
                const videoId = extractYoutubeId(doc.video_url);
                if (videoId) {
                  return (
                    <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="Video Kegiatan"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                }
                return (
                  <a
                    href={doc.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Tonton Video
                  </a>
                );
              })()}
            </div>
          )}
        </div>

        {/* All Photos */}
        {doc.fotos && doc.fotos.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-base font-semibold text-text mb-4">Semua Foto ({doc.fotos.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {doc.fotos.map((foto, i) => (
                <button
                  key={foto.id}
                  onClick={() => setSelectedPhotoIdx(i)}
                  className="aspect-square rounded-xl overflow-hidden bg-surface-dim hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group"
                >
                  <img
                    src={foto.foto_url}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo lightbox — rendered via portal to document.body so it's truly fullscreen */}
      {selectedPhotoIdx !== null && doc.fotos && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          style={{ margin: 0 }}
          onClick={() => setSelectedPhotoIdx(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
            onClick={() => setSelectedPhotoIdx(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/70 text-sm font-medium bg-black/40 px-3 py-1.5 rounded-lg z-10">
            {selectedPhotoIdx + 1} / {doc.fotos.length}
          </div>

          {/* Previous button */}
          {selectedPhotoIdx > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10"
              onClick={e => { e.stopPropagation(); setSelectedPhotoIdx(selectedPhotoIdx - 1); }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next button */}
          {selectedPhotoIdx < doc.fotos.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10"
              onClick={e => { e.stopPropagation(); setSelectedPhotoIdx(selectedPhotoIdx + 1); }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <img
            src={doc.fotos[selectedPhotoIdx]?.foto_url}
            alt={`Foto ${selectedPhotoIdx + 1}`}
            className="max-w-full max-h-[90vh] object-contain rounded-lg animate-scale-in"
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* Delete modal — rendered via portal to document.body so it's centered on full viewport */}
      {showDeleteModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-[20vh] p-4"
          style={{ margin: 0 }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scale-in shadow-2xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mb-4">
                <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text mb-1">Pindahkan ke Sampah?</h3>
              <p className="text-sm text-text-secondary mb-6">
                Dokumentasi akan dipindahkan ke folder sampah. Anda bisa memulihkan kapan saja sebelum 30 hari.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-dim transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-danger rounded-xl hover:bg-danger-light disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Memindahkan...' : 'Ya, Pindahkan'}
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
