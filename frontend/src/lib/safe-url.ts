/**
 * Safe URL validation and sanitization for frontend defense-in-depth against XSS.
 * Enforces http: or https: protocols and max length 2048.
 */
export function isSafeUrl(urlStr: unknown): boolean {
  if (typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitizes a URL for use in href attributes.
 * Rejects javascript:, data:, vbscript:, file: and returns fallback (default '#').
 */
export function sanitizeUrl(url: string | null | undefined, fallback = '#'): string {
  if (!url) return fallback;
  const trimmed = url.trim();
  return isSafeUrl(trimmed) ? trimmed : fallback;
}

/**
 * Sanitizes an image URL for use in src attributes.
 * Rejects javascript:, vbscript:, etc. and returns fallback (default '').
 */
export function sanitizeImageUrl(url: string | null | undefined, fallback = ''): string {
  if (!url) return fallback;
  const trimmed = url.trim();
  return isSafeUrl(trimmed) ? trimmed : fallback;
}
