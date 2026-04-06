/**
 * Safe error message for API responses.
 * In production, returns generic message to avoid leaking internals.
 * In development, returns full error details.
 */
export function safeError(error: unknown, genericMessage: string): string {
  if (process.env.NODE_ENV === 'development') {
    return `${genericMessage}: ${error instanceof Error ? error.message : String(error)}`;
  }
  // Production: log full error, return generic message
  console.error(`[Error] ${genericMessage}:`, error);
  return genericMessage;
}
