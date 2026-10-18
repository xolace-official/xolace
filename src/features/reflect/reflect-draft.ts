import { useEffect } from 'react';
import { useAuth } from '@clerk/expo';
import { zustandJSONStorage } from '@/src/lib/storage/unified-storage';
import type { ReflectionStateName } from '@/src/features/reflect/types';

/**
 * The unsent reflection, kept on the device so an app kill mid-paragraph
 * doesn't take the person's words with it. Only *unsent* text lives here: it
 * is cleared the moment the server holds it (submit resolved), so a restart
 * can never offer an already-sent reflection as if it were new.
 *
 * Not in the Zustand store: the store is devtools-visible app state, and this
 * is the most private text in the app. Never used for Vent, which is never
 * stored anywhere.
 */
// TODO: not yet tested on a device. Verify: type a draft, kill the app,
// relaunch (draft restored); submit then kill (not restored); sign out and in
// as another account (not restored); discard then kill (not restored).
type StoredDraft = { userId: string; text: string; savedAt: number };

const KEY = 'xolace-reflect-draft';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const WRITE_DEBOUNCE_MS = 1000;
const COMPOSE_SCREENS: ReflectionStateName[] = ['idle', 'typing', 'typing-nudge'];

function read(): StoredDraft | null {
  try {
    const raw = zustandJSONStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredDraft) : null;
  } catch {
    return null;
  }
}

/** The caller's own draft if it is under a day old, else ''. */
export function readReflectDraft(userId: string | null | undefined): string {
  const draft = read();
  if (!draft || !userId || draft.userId !== userId) return '';
  return Date.now() - draft.savedAt < MAX_AGE_MS ? draft.text : '';
}

export function clearReflectDraft() {
  void zustandJSONStorage.removeItem(KEY).catch(() => {});
}

/**
 * Mirrors `entryText` to disk while the person is composing. Leaving the
 * compose screens cancels a pending write, so a debounce can't land after the
 * submit has cleared the draft.
 */
export function usePersistReflectDraft(
  userId: string | null | undefined,
  text: string,
  screen: ReflectionStateName,
) {
  const composing = COMPOSE_SCREENS.includes(screen);
  useEffect(() => {
    if (!composing || !userId) return;
    // A discard is a decision: no debounce window in which a kill revives it.
    if (!text.trim()) return clearReflectDraft();
    const timer = setTimeout(() => {
      const draft: StoredDraft = { userId, text, savedAt: Date.now() };
      void zustandJSONStorage.setItem(KEY, JSON.stringify(draft)).catch(() => {});
    }, WRITE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [userId, text, composing]);
}

/**
 * Root-mounted, like `ChatLocalDataGuard`: sign-out, account deletion and an
 * account switch each leave the previous person's unsent words on the phone.
 * The stored draft names its owner, so a switch made while the app was closed
 * is caught on mount too.
 */
export function ReflectDraftGuard() {
  const { isLoaded, userId } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    const draft = read();
    if (draft && draft.userId !== userId) clearReflectDraft();
  }, [isLoaded, userId]);
  return null;
}
