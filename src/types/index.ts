export interface User {
  id: number;
  username: string;
  name: string;
  role: 'superadmin' | 'admin' | 'kepsek' | 'guru';
  created_at: string;
}

export type UploadMode = 'single' | 'collage';

export interface Dokumentasi {
  id: number;
  tanggal: string;
  guru_id: number;
  guru_name: string;
  nama_kegiatan: string;
  deskripsi: string;
  video_url: string;
  upload_mode: UploadMode;
  layout: CollageLayout;
  collage_url: string;
  created_at: string;
  updated_at: string;
}

export interface Foto {
  id: number;
  dokumentasi_id: number;
  foto_url: string;
  sort_order: number;
  created_at: string;
}

export interface DokumentasiWithFotos extends Dokumentasi {
  fotos: Foto[];
}

export type CollageLayout = 'grid-1x1' | 'grid-2x2' | 'grid-3x3' | 'grid-3x4' | 'grid-1x3x3' | 'grid-1x3x3x3' | 'horizontal' | 'vertical';

export interface JWTPayload {
  userId: number;
  username: string;
  name: string;
  role: 'superadmin' | 'admin' | 'kepsek' | 'guru';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
