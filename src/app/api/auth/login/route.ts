import { cookies } from 'next/headers';
import { type NextRequest } from 'next/server';
import db from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/lib/constants';
import { checkLoginRateLimit, resetLoginRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const rateCheck = checkLoginRateLimit(ip);
    if (!rateCheck.allowed) {
      return Response.json(
        { success: false, error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil((rateCheck.retryAfterSeconds || 0) / 60)} menit.` },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json(
        { success: false, error: 'Username dan password harus diisi' },
        { status: 400 }
      );
    }

    const user = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username) as { id: number; username: string; password: string; name: string; role: string } | undefined;

    if (!user) {
      return Response.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const isValid = comparePassword(password, user.password);
    if (!isValid) {
      return Response.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Login successful — reset rate limit for this IP
    resetLoginRateLimit(ip);

    const token = await signToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'superadmin' | 'admin' | 'kepsek' | 'guru',
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return Response.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
