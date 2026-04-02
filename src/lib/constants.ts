export const APP_NAME = 'Kolase Pembelajaran';
export const SCHOOL_NAME = 'SLB BCD Nusantara';

export const JWT_SECRET = process.env.JWT_SECRET || 'kolase-slb-nusantara-secret-key-2024';
export const JWT_EXPIRES_IN = '7d';
export const COOKIE_NAME = 'kolase_token';

export const MAX_PHOTOS_PER_ENTRY = 12;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const COMPRESSED_MAX_WIDTH = 1200;
export const COMPRESSED_QUALITY = 80;
export const COLLAGE_SIZE = 1200;
export const COLLAGE_GAP = 6;

export const UPLOAD_DIR = 'uploads';
export const ORIGINALS_DIR = `${UPLOAD_DIR}/originals`;
export const COLLAGES_DIR = `${UPLOAD_DIR}/collages`;
