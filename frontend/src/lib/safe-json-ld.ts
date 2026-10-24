/**
 * Safely serializes an object for inclusion in an HTML <script type="application/ld+json"> tag.
 * Replaces <, >, &, U+2028, and U+2029 with unicode escape sequences so that "</script>"
 * or HTML breakout payloads cannot break out of the script tag and execute stored XSS.
 */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export default safeJsonLd;
