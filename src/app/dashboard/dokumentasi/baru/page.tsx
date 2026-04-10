'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { useUser } from '../../layout';
import { MAX_PHOTOS_PER_ENTRY, MAX_FILE_SIZE } from '@/lib/constants';
import { compressImages } from '@/lib/compress-client';
import type { CollageLayout } from '@/types';
import type { UploadMode } from '@/types';

interface GuruOption {
  id: number;
  name: string;
  role: string;
}

interface PreviewFile {
  file: File;
  preview: string;
}

export default function CreateDokumentasiPage() {
  const router = useRouter();
  const user = useUser();

  const [step, setStep] = useState(1);
  const [uploadMode, setUploadMode] = useState<UploadMode>('collage');
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState('');
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [layout, setLayout] = useState<CollageLayout>('grid-2x2');
  const [submitting, setSubmitting] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Form fields
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Guru selection for admin/superadmin/kepsek
  const [guruList, setGuruList] = useState<GuruOption[]>([]);
  const [selectedGuruId, setSelectedGuruId] = useState<number | null>(null);
  const [selectedGuruName, setSelectedGuruName] = useState('');
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Filter only guru users
            const gurus = (data.data as GuruOption[]).filter(u => u.role === 'guru');
            setGuruList(gurus);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const isSingle = uploadMode === 'single';
  const maxFiles = isSingle ? 1 : MAX_PHOTOS_PER_ENTRY;

  // Total steps: single=3 (mode→upload→data), collage=4 (mode→upload→layout→data)
  const totalSteps = isSingle ? 3 : 4;

  const stepLabels = isSingle
    ? ['Pilih Mode', 'Upload Foto', 'Isi Data']
    : ['Pilih Mode', 'Upload Foto', 'Pilih Layout', 'Isi Data'];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter out files that exceed max size
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];

    acceptedFiles.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(`${file.name} (${formatFileSize(file.size)})`);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      toast.error(
        `${oversizedFiles.length} file melebihi batas ${formatFileSize(MAX_FILE_SIZE)}:\n${oversizedFiles.join(', ')}`,
        { duration: 5000 }
      );
    }

    const remaining = maxFiles - files.length;
    const newFiles = validFiles.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, [files.length, maxFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Drag & drop reorder handlers
  const handleDragStart = (index: number) => {
    setDragIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIndex) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    setFiles(prev => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIdx, 1);
      updated.splice(dropIndex, 0, dragged);
      return updated;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: maxFiles,
    maxSize: MAX_FILE_SIZE,
    multiple: !isSingle,
    onDropRejected: (fileRejections) => {
      const sizeErrors = fileRejections.filter(r =>
        r.errors.some(e => e.code === 'file-too-large')
      );
      if (sizeErrors.length > 0) {
        const names = sizeErrors.map(r => `${r.file.name} (${formatFileSize(r.file.size)})`);
        toast.error(
          `${names.length} file melebihi batas ${formatFileSize(MAX_FILE_SIZE)}:\n${names.join(', ')}`,
          { duration: 5000 }
        );
      }
      const typeErrors = fileRejections.filter(r =>
        r.errors.some(e => e.code === 'file-invalid-type')
      );
      if (typeErrors.length > 0) {
        toast.error('Format file harus JPG, PNG, atau WebP');
      }
    },
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Pilih minimal satu foto');
      return;
    }

    setUploading(true);
    try {
      // Step 1: Compress images in browser
      setCompressing(true);
      setCompressProgress(`Mengompres foto 1/${files.length}...`);

      const originalFiles = files.map(f => f.file);
      const originalSize = originalFiles.reduce((sum, f) => sum + f.size, 0);

      const compressedFiles = await compressImages(originalFiles, (current, total) => {
        setCompressProgress(`Mengompres foto ${current}/${total}...`);
      });

      const compressedSize = compressedFiles.reduce((sum, f) => sum + f.size, 0);
      const savedPercent = Math.round((1 - compressedSize / originalSize) * 100);
      if (savedPercent > 0) {
        toast.success(`Foto dikompres ${savedPercent}% lebih kecil`, { duration: 2000 });
      }

      setCompressing(false);
      setCompressProgress('');

      // Step 2: Upload compressed files
      const formData = new FormData();
      compressedFiles.forEach(f => formData.append('photos', f));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadedPaths(data.data.paths);
        toast.success(`${data.data.paths.length} foto berhasil diupload`);
        if (isSingle) {
          setStep(3);
        } else {
          setStep(3);
        }
      } else {
        toast.error(data.error || 'Gagal upload foto');
      }
    } catch {
      toast.error('Gagal upload foto');
    } finally {
      setUploading(false);
      setCompressing(false);
      setCompressProgress('');
    }
  };

  const handleSubmit = async () => {
    if (!tanggal || !namaKegiatan) {
      toast.error('Nama kegiatan dan tanggal harus diisi');
      return;
    }

    if (isAdmin && !selectedGuruId) {
      toast.error('Pilih guru terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/dokumentasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          guru_id: isAdmin && selectedGuruId ? selectedGuruId : user?.userId,
          guru_name: isAdmin && selectedGuruName ? selectedGuruName : user?.name,
          nama_kegiatan: namaKegiatan,
          deskripsi,
          video_url: videoUrl,
          upload_mode: uploadMode,
          layout: isSingle ? 'grid-1x1' : layout,
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

  const handleSelectMode = (mode: UploadMode) => {
    setUploadMode(mode);
    // Reset files when switching mode
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setUploadedPaths([]);
    setStep(2);
  };

  // For collage mode: which step is the data step?
  const dataStep = isSingle ? 3 : 4;
  const layoutStep = isSingle ? -1 : 3; // -1 means no layout step

  const layouts: { value: CollageLayout; label: string; desc: string }[] = [
    { value: 'grid-2x2', label: 'Grid 2×2', desc: 'Cocok untuk 2-4 foto' },
    { value: 'grid-1x3x3', label: '1 Besar + 3×2', desc: 'Cocok untuk 7 foto' },
    { value: 'grid-3x3', label: 'Grid 3×3', desc: 'Cocok untuk 5-9 foto' },
    { value: 'grid-1x3x3x3', label: '1 Besar + 3×3', desc: 'Cocok untuk 10 foto' },
    { value: 'grid-3x4', label: 'Grid 3×4', desc: 'Cocok untuk 10-12 foto' },
    { value: 'horizontal', label: 'Horizontal', desc: 'Foto berjajar horizontal' },
    { value: 'vertical', label: 'Vertikal', desc: 'Foto berjajar vertikal' },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => {
            if (step > 1) {
              // Go back to previous step
              if (step === dataStep) {
                setStep(isSingle ? 2 : layoutStep);
              } else {
                setStep(step - 1);
              }
            } else {
              router.back();
            }
          }}
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
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const s = idx + 1;
          return (
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
                {stepLabels[idx]}
              </span>
              {s < totalSteps && <div className={`flex-1 h-0.5 rounded-full ${step > s ? 'bg-primary-500' : 'bg-border'}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Choose Upload Mode */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-border p-6 animate-scale-in">
          <h2 className="text-lg font-semibold text-text mb-2">Pilih Jenis Dokumentasi</h2>
          <p className="text-sm text-text-secondary mb-6">Pilih apakah ingin mengupload 1 foto atau membuat kolase dari beberapa foto</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Single Photo Option */}
            <button
              onClick={() => handleSelectMode('single')}
              className="group relative p-6 rounded-2xl border-2 border-border hover:border-primary-400 hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-text mb-1 group-hover:text-primary-700 transition-colors">Upload 1 Foto</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Upload satu foto dokumentasi. Tinggi template akan mengikuti ukuran foto Anda.
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Pilih ini
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Collage Option */}
            <button
              onClick={() => handleSelectMode('collage')}
              className="group relative p-6 rounded-2xl border-2 border-border hover:border-accent hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-text mb-1 group-hover:text-accent transition-colors">Upload Kolase</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Upload beberapa foto dan buat kolase dengan berbagai template layout.
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Pilih ini
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Upload Photos */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-border p-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-text">
              {isSingle ? 'Upload 1 Foto' : 'Upload Foto Kegiatan'}
            </h2>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              isSingle
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {isSingle ? '📷 1 Foto' : '🖼️ Kolase'}
            </span>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            {isSingle
              ? 'Upload 1 foto dokumentasi (JPG, PNG, WebP)'
              : `Maksimal ${MAX_PHOTOS_PER_ENTRY} foto (JPG, PNG, WebP)`}
          </p>

          {/* Show dropzone only if not reached max files */}
          {files.length < maxFiles && (
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
              <p className="text-xs text-text-muted mt-1">
                JPG, PNG, WebP • Maks 10MB per foto
                {isSingle && ' • Hanya 1 foto'}
              </p>
            </div>
          )}

          {/* Preview with drag & drop reorder */}
          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-text">{files.length} foto dipilih</p>
                {!isSingle && files.length > 1 && (
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    Seret untuk mengatur urutan
                  </p>
                )}
              </div>
              <div className={`grid gap-2 ${
                isSingle ? 'grid-cols-1 max-w-sm' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'
              }`}>
                {files.map((f, i) => (
                  <div
                    key={f.preview}
                    draggable={!isSingle && files.length > 1}
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    className={`relative group overflow-hidden bg-surface-dim rounded-xl transition-all duration-200 ${
                      isSingle ? 'aspect-auto max-h-64' : 'aspect-square'
                    } ${
                      !isSingle && files.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${
                      dragIdx === i ? 'opacity-40 scale-95 ring-2 ring-primary-400' : ''
                    } ${
                      dragOverIdx === i && dragIdx !== i ? 'ring-2 ring-primary-500 ring-offset-2 scale-105' : ''
                    }`}
                  >
                    <img src={f.preview} alt={`Preview ${i + 1}`} className={`w-full h-full ${isSingle ? 'object-contain' : 'object-cover'} pointer-events-none`} />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {!isSingle && (
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {i + 1}
                      </div>
                    )}
                    {!isSingle && files.length > 1 && (
                      <div className="absolute top-1 left-1 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => { setStep(1); files.forEach(f => URL.revokeObjectURL(f.preview)); setFiles([]); }}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text transition-colors"
            >
              Kembali
            </button>
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
                  {compressing ? compressProgress : 'Mengupload...'}
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

      {/* Step 3 (collage only): Choose Layout */}
      {step === layoutStep && (
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
                  {l.value === 'grid-2x2' && (
                    <svg width="48" height="48" viewBox="0 0 48 48" className="rounded">
                      <rect x="2" y="2" width="20" height="20" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="26" y="2" width="20" height="20" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="2" y="26" width="20" height="20" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="26" y="26" width="20" height="20" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                    </svg>
                  )}
                  {l.value === 'grid-1x3x3' && (
                    <svg width="48" height="56" viewBox="0 0 48 56" className="rounded">
                      <rect x="2" y="2" width="44" height="16" rx="3" className={layout === l.value ? 'fill-primary-500' : 'fill-gray-400'} />
                      <rect x="2" y="22" width="13" height="13" rx="2" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="18" y="22" width="13" height="13" rx="2" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="34" y="22" width="13" height="13" rx="2" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="2" y="38" width="13" height="13" rx="2" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="18" y="38" width="13" height="13" rx="2" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="34" y="38" width="13" height="13" rx="2" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                    </svg>
                  )}
                  {l.value === 'grid-3x3' && (
                    <svg width="48" height="48" viewBox="0 0 48 48" className="rounded">
                      {[0,1,2].map(r => [0,1,2].map(c => (
                        <rect key={`${r}-${c}`} x={2 + c * 16} y={2 + r * 16} width="12" height="12" rx="2" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      )))}
                    </svg>
                  )}
                  {l.value === 'grid-1x3x3x3' && (
                    <svg width="48" height="68" viewBox="0 0 48 68" className="rounded">
                      <rect x="2" y="2" width="44" height="14" rx="3" className={layout === l.value ? 'fill-primary-500' : 'fill-gray-400'} />
                      {[0,1,2].map(r => [0,1,2].map(c => (
                        <rect key={`${r}-${c}`} x={2 + c * 16} y={20 + r * 17} width="12" height="13" rx="2" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      )))}
                    </svg>
                  )}
                  {l.value === 'grid-3x4' && (
                    <svg width="48" height="64" viewBox="0 0 48 64" className="rounded">
                      {[0,1,2,3].map(r => [0,1,2].map(c => (
                        <rect key={`${r}-${c}`} x={2 + c * 16} y={2 + r * 16} width="12" height="12" rx="2" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      )))}
                    </svg>
                  )}
                  {l.value === 'horizontal' && (
                    <svg width="48" height="28" viewBox="0 0 48 28" className="rounded">
                      <rect x="2" y="2" width="12" height="24" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="18" y="2" width="12" height="24" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="34" y="2" width="12" height="24" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                    </svg>
                  )}
                  {l.value === 'vertical' && (
                    <svg width="28" height="48" viewBox="0 0 28 48" className="rounded">
                      <rect x="2" y="2" width="24" height="12" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="2" y="18" width="24" height="12" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                      <rect x="2" y="34" width="24" height="12" rx="3" className={layout === l.value ? 'fill-primary-400' : 'fill-gray-300'} />
                    </svg>
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
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={() => setStep(dataStep)}
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

      {/* Final Step: Fill Data */}
      {step === dataStep && (
        <div className="bg-white rounded-2xl border border-border p-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-text">Detail Kegiatan</h2>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              isSingle
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {isSingle ? '📷 1 Foto' : `🖼️ ${layouts.find(l => l.value === layout)?.label || 'Kolase'}`}
            </span>
          </div>

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
              <p className="text-xs text-text-muted mt-1">Nama kegiatan akan ditampilkan pada {isSingle ? 'foto' : 'kolase'}</p>
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
                <label className="block text-sm font-medium text-text mb-1.5">Guru {isAdmin && <span className="text-danger">*</span>}</label>
                {isAdmin ? (
                  <select
                    value={selectedGuruId || ''}
                    onChange={e => {
                      const id = Number(e.target.value);
                      setSelectedGuruId(id);
                      const guru = guruList.find(g => g.id === id);
                      setSelectedGuruName(guru?.name || '');
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">-- Pilih Guru --</option>
                    {guruList.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dark text-sm text-text-secondary cursor-not-allowed"
                  />
                )}
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

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Link Video YouTube</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                    <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white"/>
                  </svg>
                </div>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-text-muted mt-1">Opsional — video YouTube terkait kegiatan</p>
            </div>
          </div>

          {/* Preview thumbnails */}
          <div className="bg-surface-dim rounded-xl p-3 mt-4">
            <p className="text-xs font-medium text-text-secondary mb-2">
              {isSingle ? 'Foto yang diupload' : `Foto yang diupload (${uploadedPaths.length})`}
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {uploadedPaths.map((p, i) => (
                <div key={i} className={`rounded-lg overflow-hidden bg-border ${isSingle ? 'w-20 h-20' : 'w-12 h-12'}`}>
                  <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(isSingle ? 2 : layoutStep)}
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
