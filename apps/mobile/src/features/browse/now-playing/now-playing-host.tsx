import { useEffect } from 'react';
import type { Id } from '@/convex/_generated/dataModel';
import { useTrackPlayback } from '@/src/features/browse/use-track-playback';
import { usePlusEntitlement } from '@/src/features/purchases/use-plus-entitlement';
import { clearNowPlaying, publishPlayback, useNowPlaying } from '@/src/features/browse/now-playing/now-playing-store';

/**
 * Owns the Browse track's audio above every screen (S4), so closing the
 * player leaves it playing and a twig still tends on a natural finish.
 * Renders nothing; mints nothing until something is loaded.
 */
export function NowPlayingHost() {
  const np = useNowPlaying();
  const { isPlus, isResolved } = usePlusEntitlement();
  // Leaving the protected tree (sign-out) drops the track with it.
  useEffect(() => clearNowPlaying, []);
  // A lapsed entitlement drops the track here, not only in the player screen:
  // the mini-player resumes the loaded URL without ever opening that screen.
  // `isResolved`, so a still-loading `false` never cuts off a paying user.
  const lapsed = isResolved && !isPlus;
  useEffect(() => {
    if (lapsed) clearNowPlaying();
  }, [lapsed, np]);
  // Keyed by slug: a new track gets a fresh player. A new twig on the same
  // track keeps the audio; `useTrackPlayback` re-arms its latch on `stepId`.
  return np ? <Runner key={np.slug} slug={np.slug} stepId={np.stepId} /> : null;
}

function Runner({ slug, stepId }: { slug: string; stepId?: Id<'path_steps'> }) {
  const p = useTrackPlayback(slug, { stepId });
  // Every render: `p` is rebuilt from the latest status each time.
  useEffect(() => publishPlayback(p));
  useEffect(() => () => publishPlayback(null), []);
  return null;
}
