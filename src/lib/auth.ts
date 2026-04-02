import { SignJWT, jwtVerify } from 'jose';
import { hashSync, compareSync } from 'bcryptjs';
import { JWT_SECRET, JWT_EXPIRES_IN, COOKIE_NAME } from './constants';
import type { JWTPayload } from '@/types';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(JWT_SECRET);

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(JWT_EXPIRES_IN)
    .setIssuedAt()
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return compareSync(password, hash);
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);
  if (!token?.value) return null;
  return verifyToken(token.value);
}
