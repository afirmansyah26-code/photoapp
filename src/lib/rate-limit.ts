/**
 * Simple in-memory rate limiter for login attempts and API requests
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ============ Login Rate Limiter ============
const loginAttempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ============ General API Rate Limiter ============
const apiRequests = new Map<string, RateLimitEntry>();

const API_MAX_REQUESTS = 60; // 60 requests per window
const API_WINDOW_MS = 60 * 1000; // 1 minute

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(key);
  }
  for (const [key, entry] of apiRequests) {
    if (now > entry.resetAt) apiRequests.delete(key);
  }
}, 5 * 60 * 1000);

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true };
}

export function resetLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

export function checkApiRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = apiRequests.get(ip);

  if (!entry || now > entry.resetAt) {
    apiRequests.set(ip, { count: 1, resetAt: now + API_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= API_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true };
}
