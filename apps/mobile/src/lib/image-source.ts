import type { ImageSource } from 'expo-image';

/**
 * An `expo-image` source for a hosted image. A signed R2 link changes its signature on every
 * read, so it's cached by its path instead — safe because R2 keys are content-addressed
 * (`<prefix>/<sha256>.<ext>`). Any other link is cached as itself.
 */
export function imageSource(uri: string): ImageSource {
  const q = uri.indexOf('?');
  return q !== -1 && uri.includes('X-Amz-Signature', q) ? { uri, cacheKey: uri.slice(0, q) } : { uri };
}
