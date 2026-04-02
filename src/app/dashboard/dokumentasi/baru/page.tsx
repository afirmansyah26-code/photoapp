'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { useUser } from '../../layout';
import { MAX_PHOTOS_PER_ENTRY } from '@/lib/constants';
import type { CollageLayout } from '@/types';

interface PreviewFile {
  file: File;
  preview: string;
}

export default function CreateDokumentasiPage() {
  const router = useRouter();
  const user = useUser();

  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [layout, setLayout] = useState<CollageLayout>('grid-2x2');
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const remaining = MAX_PHOTOS_PER_ENTRY - files.length;
    const newFiles = acceptedFiles.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length]);

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: MAX_PHOTOS_PER_ENTRY,
    multiple: true,
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Pilih minimal satu foto');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('photos', f.file));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadedPaths(data.data.paths);
        toast.success(`${data.data.paths.length} foto berhasil diupload`);
        setStep(2);
      } else {
        toast.error(data.error || 'Gagal upload foto');
      }
    } catch {
      toast.error('Gagal upload foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!tanggal || !namaKegiatan) {
      toast.error('Nama kegiatan dan tanggal harus diisi');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/dokumentasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          guru_id: user?.userId,
          guru_name: user?.name,
          nama_kegiatan: namaKegiatan,
          deskripsi,
          layout,
          photo_paths: uploadedPaths,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Dokumentasi berhasil disimpan!');
        router.push(`/dashboard/dokumentasi/${data.data.id}`);
      } else {
        toast.error(data.error || 'Gagal menyimpan');
      }
    } catch {
      toast.error('Gagal menyimpan dokumentasi');
    } finally {
      setSubmitting(false);
    }
  };

  const layouts: { value: CollageLayout; label: string; desc: string }[] = [
    { value: 'grid-1x1', label: '1 Foto', desc: 'Untuk 1 foto saja' },
    { value: 'grid-2x2', label: 'Grid 2×2', desc: 'Cocok untuk 4 foto' },
    { value: 'grid-3x3', label: 'Grid 3×3', desc: 'Cocok untuk 5-9 foto' },
    { value: 'grid-3x4', label: 'Grid 3×4', desc: 'Cocok untuk 10-12 foto' },
    { value: 'horizontal', label: 'Horizontal', desc: 'Foto berjajar horizontal' },
    { value: 'vertical', label: 'Vertikal', desc: 'Foto berjajar vertikal' },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-text-secondary hover:text-text flex items-center gap-1 mb-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>
        <h1 className="text-xl font-bold text-text">Tambah Dokumentasi</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= s
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                : 'bg-surface-dark text-text-muted'
            }`}>
              {step > s ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : s}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step >= s ? 'text-primary-700' : 'text-text-muted'}`}>
              {s === 1 ? 'Upload Foto' : s === 2 ? 'Pilih Layout' : 'Isi Data'}
            </span>
            {s < 3 && <div className={`flex-1 h-0.5 rounded-full ${step > s ? 'bg-primary-500' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload Photos */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-border p-6 animate-scale-in">
          <h2 className="text-lg font-semibold text-text mb-4">Upload Foto Kegiatan</h2>
          <p className="text-sm text-text-secondary mb-4">Maksimal {MAX_PHOTOS_PER_ENTRY} foto (JPG, PNG, WebP)</p>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-border hover:border-primary-300 hover:bg-surface-dim'
            }`}
          >
            <input {...getInputProps()} />
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-2xl mb-3">
              <svg className="w-7 h-7 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text">
              {isDragActive ? 'Lepaskan foto di sini...' : 'Klik atau seret foto ke sini'}
            </p>
            <p className="text-xs text-text-muted mt-1">JPG, PNG, WebP • Maks 10MB per foto</p>
          </div>

          {/* Preview */}
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-text mb-2">{files.length} foto dipilih</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-surface-dim">
                    <img src={f.preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-primary-500/20"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Mengupload...
                </>
              ) : (
                <>
                  Upload & Lanjut
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Layout */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-border p-6 animate-scale-in">
          <h2 className="text-lg font-semibold text-text mb-4">Pilih Layout Kolase</h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {layouts.map(l => (
              <button
                key={l.value}
                onClick={() => setLayout(l.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  layout === l.value
                    ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-500/10'
                    : 'border-border hover:border-primary-200'
                }`}
              >
                <div className="mb-2">
                  {l.value === 'grid-1x1' && (
                    <div className="flex items-center justify-center w-12 h-12">
                      <div className={`w-10 h-10 rounded ${layout === l.value ? 'bg-primary-400' : 'bg-border-dark'}`} />
                    </div>
                  )}
                  {l.value === 'grid-2x2' && (
                    <div className="grid grid-cols-2 gap-1 w-12 h-12">
                      {[1,2,3,4].map(i => <div key={i} className={`rounded ${layout === l.value ? 'bg-primary-400' : 'bg-border-dark'}`} />)}
                    </div>
                  )}
                  {l.value === 'grid-3x3' && (
                    <div className="grid grid-cols-3 gap-0.5 w-12 h-12">
                      {[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className={`rounded-sm ${layout === l.value ? 'bg-primary-400' : 'bg-border-dark'}`} />)}
                    </div>
                  )}
                  {l.value === 'grid-3x4' && (
                    <div className="grid grid-cols-3 gap-0.5 w-12 h-16">
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <div key={i} className={`rounded-sm ${layout === l.value ? 'bg-primary-400' : 'bg-border-dark'}`} />)}
                    </div>
                  )}
                  {l.value === 'horizontal' && (
                    <div className="flex gap-1 w-12 h-8">
                      {[1,2,3].map(i => <div key={i} className={`flex-1 rounded ${layout === l.value ? 'bg-primary-400' : 'bg-border-dark'}`} />)}
                    </div>
                  )}
                  {l.value === 'vertical' && (
                    <div className="flex flex-col gap-1 w-8 h-12">
                      {[1,2,3].map(i => <div key={i} className={`flex-1 rounded ${layout === l.value ? 'bg-primary-400' : 'bg-border-dark'}`} />)}
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-text">{l.label}</p>
                <p className="text-xs text-text-muted">{l.desc}</p>
              </button>
            ))}
          </div>

          {/* Preview thumbnails */}
          <div className="bg-surface-dim rounded-xl p-3 mb-4">
            <p className="text-xs font-medium text-text-secondary mb-2">Foto yang diupload ({uploadedPaths.length})</p>
            <div className="flex gap-1.5 flex-wrap">
              {uploadedPaths.map((p, i) => (
                <div key={i} className="w-12 h-12 rounded-lg overflow-hidden bg-border">
                  <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/20"
            >
              Lanjut
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Fill Data */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-border p-6 animate-scale-in">
          <h2 className="text-lg font-semibold text-text mb-4">Detail Kegiatan</h2>

          <div className="space-y-4">
            {/* Nama Kegiatan */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Nama Kegiatan <span className="text-danger">*</span></label>
              <input
                type="text"
                value={namaKegiatan}
                onChange={e => setNamaKegiatan(e.target.value)}
                placeholder="Contoh: Belajar Membaca, Senam Pagi, Lomba HUT RI"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-text-muted mt-1">Nama kegiatan akan ditampilkan pada kolase</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Tanggal <span className="text-danger">*</span></label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={e => setTanggal(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Guru</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dark text-sm text-text-secondary cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Deskripsi Kegiatan</label>
              <textarea
                value={deskripsi}
                onChange={e => setDeskripsi(e.target.value)}
                placeholder="Tuliskan deskripsi kegiatan pembelajaran..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !tanggal || !namaKegiatan}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-accent to-accent-light text-white text-sm font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-accent/20"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menyimpan...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Simpan Dokumentasi
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
