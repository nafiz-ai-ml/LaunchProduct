/**
 * Safely escapes XML / SVG / HTML entities: &, <, >, ", '
 * Ensures any interpolated user field cannot execute XML injection or XSS.
 */
export function escapeXml(unsafe: string | null | undefined): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escapes serialized JSON for safe insertion into script tags like JSON-LD.
 * Neutralizes </script>, HTML tags, and Unicode line/paragraph separators.
 */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export default escapeXml;

