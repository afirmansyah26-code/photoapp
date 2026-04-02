import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/constants';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);

  return Response.json({ success: true, message: 'Berhasil logout' });
}
