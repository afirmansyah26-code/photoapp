import { processUploadedFiles } from '@/lib/upload';
import { MAX_PHOTOS_PER_ENTRY } from '@/lib/constants';

export async function POST(request: Request) {
  try {
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
      { success: false, error: 'Gagal mengupload foto' },
      { status: 500 }
    );
  }
}
