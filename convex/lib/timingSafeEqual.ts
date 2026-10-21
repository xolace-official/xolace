/**
 * Byte-by-byte with no early return on the first mismatch. The length check
 * leaks only the length: callers compare fixed-length values (hex digests),
 * so it carries nothing secret.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
