import { PosterHeader } from './poster-header';
import { ImageHeader } from './image-header';

/**
 * Which masthead the discovery screen renders. Flip this constant to compare
 * the two on device — there is deliberately no UI switch for it.
 *
 *   'poster' — solid accent field, illustration as a cropped art tile.
 *   'image'  — illustration full-bleed behind an accent scrim.
 */
const HEADER_VARIANT: 'poster' | 'image' = 'poster';

export function DiscoveryHeader() {
  return HEADER_VARIANT === 'poster' ? <PosterHeader /> : <ImageHeader />;
}
