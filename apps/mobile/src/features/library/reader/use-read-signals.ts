/**
 * What a reader leaves behind on an entry (#410, CONTEXT.md "Library:
 * finished, helped, saved"): the view on open, finished (end reached AND
 * dwelt ≥30% of the read time — never a button), and the resume position.
 * Reached from a read twig (#412), `stepId` rides along and a finish tends it.
 */
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useConvex, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useIsPreview, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type Animated from 'react-native-reanimated';
import { useAnimatedReaction, type AnimatedRef, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { trackLibrary, type ReaderFrom } from '@/src/features/library/analytics';

type EntryId = Id<'library_entries'>;

/**
 * The reader's route params beyond the slug, read in one place: `from` for
 * analytics (#416), `stepId` from a read twig (#412), `hub` so Up next
 * follows a hub's order (#417).
 */
export const useReaderParams = () =>
  useLocalSearchParams<{ stepId?: Id<'path_steps'>; from?: ReaderFrom; hub?: string }>();

const DWELL_SHARE = 0.3;
const HELPED_FLOOR = 15; // mirrors convex/library/reads.ts
// At or past this the read is done; the next open starts from the top.
const RESUME_CEILING = 0.98;
const TEND_ATTEMPTS = 3;

/** A passive signal that didn't land; the auth-gated ones re-send once auth drops and returns. */
export const logDropped = (e: unknown) => console.warn('[library] read signal dropped:', e);

const nudgeHelped = (count: number | null, was: boolean, now?: boolean) => {
  if (count === null || now === undefined || now === was) return count;
  const next = count + (now ? 1 : -1);
  return next >= HELPED_FLOOR ? next : null;
};

/** `record`, with saved/helped flipping the reader's own state before the round trip. */
export function useRecord() {
  return useMutation(api.library.reads.record).withOptimisticUpdate((store, args) => {
    const ref = api.library.reads.getReaderState;
    const cur = store.getQuery(ref, { entryId: args.entryId });
    if (!cur) return;
    store.setQuery(ref, { entryId: args.entryId }, {
      ...cur,
      saved: args.saved ?? cur.saved,
      helped: args.helped ?? cur.helped,
      // Only a shown total can move locally; crossing up to the floor waits for the server.
      helpedCount: nudgeHelped(cur.helpedCount, cur.helped, args.helped),
    });
  });
}

export function useReadSignals({
  entryId,
  slug,
  readMin,
  scrollY,
  scrollRef,
  maxScroll,
  endAt,
}: {
  entryId: EntryId;
  slug: string;
  readMin: number;
  scrollY: SharedValue<number>;
  scrollRef: AnimatedRef<Animated.ScrollView>;
  /** Scrollable distance (content − viewport); ≤ 0 until laid out. */
  maxScroll: number;
  /** Scroll offset at which the article counts as read to its end; ∞ until laid out. */
  endAt: number;
}) {
  // Plain (stable) mutation: the effects below depend on its identity.
  const record = useMutation(api.library.reads.record);
  const state = useQuery(api.library.reads.getReaderState, { entryId });
  const [openedAt] = useState(() => Date.now());
  const [reachedEnd, setReachedEnd] = useState(false);
  const posthog = usePostHog();
  const { stepId, from } = useReaderParams();
  // A resumed app can run the reader while Convex waits on Clerk for a fresh
  // token (#472): writes wait for auth, and a flip back re-sends what didn't land.
  const { isAuthenticated } = useConvexAuth();
  // A long-press preview mounts the real reader: it leaves nothing behind.
  const isPreview = useIsPreview();

  // Every way in sets `from` (shared links too); missing means a link forgot it.
  // Once per entry, counted when a preview becomes the real reader.
  const trackedFor = useRef<EntryId | null>(null);
  useEffect(() => {
    if (isPreview || trackedFor.current === entryId) return;
    trackedFor.current = entryId;
    trackLibrary(posthog, 'library_entry_opened', { slug, from: from ?? 'unknown' });
    // slug/from/posthog are fixed for a mounted reader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, isPreview]);

  // The view: the server counts only the first open.
  const openedFor = useRef<EntryId | null>(null);
  useEffect(() => {
    if (isPreview || openedFor.current === entryId || !isAuthenticated) return;
    openedFor.current = entryId;
    record({ entryId, opened: true }).catch((e) => {
      openedFor.current = null;
      logDropped(e);
    });
  }, [record, entryId, isAuthenticated, isPreview]);

  useAnimatedReaction(
    () => scrollY.get() >= endAt,
    (now, was) => {
      if (now && !was) scheduleOnRN(setReachedEnd, true);
    }
  );

  // Finished once the end was reached and the dwell has run, whichever comes last.
  const finished = state?.finished;
  useEffect(() => {
    if (isPreview || !reachedEnd || finished !== false || !isAuthenticated) return;
    const wait = openedAt + DWELL_SHARE * readMin * 60_000 - Date.now();
    const t = setTimeout(() => record({ entryId, finished: true }).catch(logDropped), Math.max(wait, 0));
    return () => clearTimeout(t);
  }, [reachedEnd, finished, isAuthenticated, isPreview, openedAt, readMin, record, entryId]);

  // Seen flip to finished while open (read or listened), not already finished on arrival.
  const wasFinished = useRef(finished);
  useEffect(() => {
    if (!isPreview && wasFinished.current === false && finished === true) trackLibrary(posthog, 'library_entry_finished', { slug });
    wasFinished.current = finished;
  }, [finished, posthog, slug, isPreview]);

  // A read twig is tended by the finish alone (reading or listening), once.
  // A rejection frees it to try again when the connection comes back, a few times at most.
  const completeStep = useMutation(api.paths.completeStep);
  // Only the boolean: useConvexConnectionState re-renders the reader on every request start/finish.
  const convex = useConvex();
  const subscribeConnection = useCallback((cb: () => void) => convex.subscribeToConnectionState(cb), [convex]);
  const isWebSocketConnected = useSyncExternalStore(
    subscribeConnection,
    () => convex.connectionState().isWebSocketConnected,
  );
  const tended = useRef(false);
  const tendAttempts = useRef(0);
  useEffect(() => {
    if (isPreview || !stepId || finished !== true || tended.current || !isWebSocketConnected || !isAuthenticated) return;
    if (tendAttempts.current >= TEND_ATTEMPTS) return;
    tended.current = true;
    tendAttempts.current += 1;
    completeStep({ stepId }).catch((e) => {
      tended.current = false;
      console.error('[useReadSignals] completeStep failed:', e);
    });
  }, [stepId, finished, completeStep, isWebSocketConnected, isAuthenticated, isPreview]);

  // Resume once, as soon as both the saved position and the layout are in.
  const restored = useRef(false);
  const position = state?.position;
  useEffect(() => {
    if (restored.current || position === undefined || maxScroll <= 0) return;
    restored.current = true;
    if (position) scrollRef.current?.scrollTo({ y: position * maxScroll, animated: false });
  }, [position, maxScroll, scrollRef]);

  // Save where they left off. The ref keeps the cleanup on the latest layout.
  const maxRef = useRef(maxScroll);
  useEffect(() => {
    maxRef.current = maxScroll;
  }, [maxScroll]);
  useEffect(
    () => () => {
      // Unrestored, scrollY is still 0 — saving would wipe the real position.
      // Losing auth unmounts the reader (the protected-route guard) before it re-renders,
      // so `isAuthenticated` is stale here; ask the client. Unmounted, there's no later
      // to retry in, so that position is dropped. `sync` is @internal to convex/react (1.45).
      const { sync } = convex as unknown as { sync: { hasAuth(): boolean } };
      if (isPreview || !restored.current || maxRef.current <= 0 || !sync.hasAuth()) return;
      const at = scrollY.get() / maxRef.current;
      record({ entryId, position: at >= RESUME_CEILING ? 0 : at }).catch(logDropped);
    },
    [record, entryId, scrollY, convex, isPreview],
  );

  return state;
}
