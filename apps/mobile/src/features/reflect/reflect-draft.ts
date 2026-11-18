import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { AppState } from "react-native";
import type { ReflectionStateName } from "@/features/reflect/types";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";

/**
 * The unsent reflection, cleared once the server holds it. Not in Zustand; never for Vent.
 */
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

// One composer at a time, so one pending write; module-level so a clear from
// Settings can cancel it. `pendingSave` runs it now (on background, on unmount).
let pendingWrite: ReturnType<typeof setTimeout> | undefined;
let pendingSave: (() => void) | undefined;
const wipeListeners = new Set<() => void>();

export function clearReflectDraft(): Promise<void> {
	clearTimeout(pendingWrite);
	pendingWrite = undefined;
	pendingSave = undefined;
	return zustandJSONStorage.removeItem(KEY).catch(() => {});
}

/**
 * Delete-my-data: the stored draft and the words on screen, or the next keystroke writes them back.
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
 * Saves `entryText` while composing: debounced, flushed on background and when the screen
 * goes (a swipe back closes Reflect), cancelled on leaving the composer.
 */
export function usePersistReflectDraft(
	userId: string | null | undefined,
	text: string,
	screen: ReflectionStateName
) {
	const composing = COMPOSE_SCREENS.includes(screen);
	// Declared first, so on unmount it runs before the write's own cleanup cancels it. A
	// clear, a send or leaving the composer has already dropped `pendingSave`.
	useEffect(() => () => pendingSave?.(), []);
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
			pendingSave = undefined;
			const draft: StoredDraft = { savedAt: Date.now(), text, userId };
			void zustandJSONStorage
				.setItem(KEY, JSON.stringify(draft))
				.catch(() => {});
		};
		const timer = setTimeout(save, WRITE_DEBOUNCE_MS);
		pendingWrite = timer;
		pendingSave = save;
		// Locking the phone may kill the app before the debounce runs. Only while
		// this write is still pending: a clear has decided the text must not land.
		const sub = AppState.addEventListener("change", (next) => {
			if (next !== "active" && pendingWrite === timer) {
				save();
			}
		});
		return () => {
			clearTimeout(timer);
			if (pendingWrite === timer) {
				pendingWrite = undefined;
				pendingSave = undefined;
			}
			sub.remove();
		};
	}, [userId, text, composing]);
}

/**
 * Root-mounted like `ChatLocalDataGuard`: clears another account's draft, even from a closed app.
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
