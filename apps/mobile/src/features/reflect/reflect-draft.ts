import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { AppState } from "react-native";
import type { ReflectionStateName } from "@/features/reflect/session/types";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";

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

export function readReflectDraft(userId: string | null | undefined): string {
	const draft = read();
	if (!(draft && userId) || draft.userId !== userId) {
		return "";
	}
	return Date.now() - draft.savedAt < MAX_AGE_MS ? draft.text : "";
}

let pendingWrite: ReturnType<typeof setTimeout> | undefined;
let pendingSave: (() => void) | undefined;
const wipeListeners = new Set<() => void>();

export function clearReflectDraft(): Promise<void> {
	clearTimeout(pendingWrite);
	pendingWrite = undefined;
	pendingSave = undefined;
	return zustandJSONStorage.removeItem(KEY).catch(() => {});
}

export function wipeReflectDraft(): Promise<void> {
	const cleared = clearReflectDraft();
	wipeListeners.forEach((listener) => listener());
	return cleared;
}

export function onReflectDraftWiped(listener: () => void) {
	wipeListeners.add(listener);
	return () => {
		wipeListeners.delete(listener);
	};
}

export function usePersistReflectDraft(
	userId: string | null | undefined,
	text: string,
	screen: ReflectionStateName
) {
	const composing = COMPOSE_SCREENS.includes(screen);
	useEffect(() => () => pendingSave?.(), []);
	useEffect(() => {
		if (!(composing && userId)) {
			return;
		}
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
