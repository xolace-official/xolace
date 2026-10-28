import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { AppState } from "react-native";
import type { ReflectionStateName } from "@/features/reflect/types";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";

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
// TODO: account switch untested on a device — sign out, sign in as another
// account, the previous draft must not appear.
type StoredDraft = { userId: string; text: string; savedAt: number };

const KEY = "xolace-reflect-draft";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const WRITE_DEBOUNCE_MS = 1000;
const COMPOSE_SCREENS: ReflectionStateName[] = [
	"idle",
	"typing",
	"typing-nudge",
];

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
	if (!(draft && userId) || draft.userId !== userId) {
		return "";
	}
	return Date.now() - draft.savedAt < MAX_AGE_MS ? draft.text : "";
}

// One composer at a time, so one pending write — module-level so a clear from
// outside the Reflect screen (Settings) can cancel it.
let pendingWrite: ReturnType<typeof setTimeout> | undefined;
const wipeListeners = new Set<() => void>();

export function clearReflectDraft(): Promise<void> {
	clearTimeout(pendingWrite);
	pendingWrite = undefined;
	return zustandJSONStorage.removeItem(KEY).catch(() => {});
}

/**
 * Delete-my-data: the stored draft *and* the words still on a mounted compose
 * screen — otherwise the next keystroke would write the deleted text back.
 */
export function wipeReflectDraft(): Promise<void> {
	const cleared = clearReflectDraft();
	wipeListeners.forEach((listener) => listener());
	return cleared;
}

/** Subscribe the in-memory draft to `wipeReflectDraft`. Returns unsubscribe. */
export function onReflectDraftWiped(listener: () => void) {
	wipeListeners.add(listener);
	return () => {
		wipeListeners.delete(listener);
	};
}

/**
 * Mirrors `entryText` to disk while the person is composing — debounced, but
 * flushed at once when the app leaves the foreground. Leaving the
 * compose screens cancels a pending write, so a debounce can't land after the
 * submit has cleared the draft.
 */
export function usePersistReflectDraft(
	userId: string | null | undefined,
	text: string,
	screen: ReflectionStateName
) {
	const composing = COMPOSE_SCREENS.includes(screen);
	useEffect(() => {
		if (!(composing && userId)) {
			return;
		}
		// A discard is a decision: no debounce window in which a kill revives it.
		if (!text.trim()) {
			void clearReflectDraft();
			return;
		}
		const save = () => {
			clearTimeout(timer);
			pendingWrite = undefined;
			const draft: StoredDraft = { savedAt: Date.now(), text, userId };
			void zustandJSONStorage
				.setItem(KEY, JSON.stringify(draft))
				.catch(() => {});
		};
		const timer = setTimeout(save, WRITE_DEBOUNCE_MS);
		pendingWrite = timer;
		// Typing then locking the phone: the debounce may never get to run before
		// the OS kills the app. Only while this write is still pending — a clear
		// (submit, discard, wipe) has already decided the text must not land.
		const sub = AppState.addEventListener("change", (next) => {
			if (next !== "active" && pendingWrite === timer) {
				save();
			}
		});
		return () => {
			clearTimeout(timer);
			sub.remove();
		};
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
		if (!isLoaded) {
			return;
		}
		const draft = read();
		if (draft && draft.userId !== userId) {
			clearReflectDraft();
		}
	}, [isLoaded, userId]);
	return null;
}
