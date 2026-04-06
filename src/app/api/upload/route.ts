import { type NextRequest } from 'next/server';
import { processUploadedFiles } from '@/lib/upload';
import { MAX_PHOTOS_PER_ENTRY } from '@/lib/constants';
import { safeError } from '@/lib/safe-error';

export async function POST(request: NextRequest) {
  try {
    // Auth check — middleware injects x-user-id for authenticated users
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (!files || files.length === 0) {
      return Response.json(
        { success: false, error: 'Tidak ada foto yang diupload' },
        { status: 400 }
      );
    }

    if (files.length > MAX_PHOTOS_PER_ENTRY) {
      return Response.json(
        { success: false, error: `Maksimal ${MAX_PHOTOS_PER_ENTRY} foto per dokumentasi` },
        { status: 400 }
      );
    }

    const paths = await processUploadedFiles(formData);

    return Response.json({
      success: true,
      data: { paths },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      { success: false, error: safeError(error, 'Gagal mengupload foto') },
      { status: 500 }
    );
  }
}
