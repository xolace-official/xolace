import { useAuth } from "@clerk/expo";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import { FOR, LETTER_MAX, type LetterFor } from "./copy";
import { END_CARD_FRESH, type EndCardMemory } from "./letters-model";

type Mine = {
	text: string;
	forWho: LetterFor;
	held: string;
	endCard: EndCardMemory;
};

export type Kept = Mine & { owner: string | null };

export const FRESH: Mine = {
	endCard: END_CARD_FRESH,
	forWho: "Anyone",
	held: "",
	text: "",
};

const VERSION = 1;

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null;
const isWords = (v: unknown): v is string =>
	typeof v === "string" && v.length <= LETTER_MAX;
const isFor = (v: unknown): v is LetterFor =>
	(FOR as readonly unknown[]).includes(v);
const isTime = (v: unknown): v is number =>
	typeof v === "number" && Number.isFinite(v);

function validEndCard(v: unknown): EndCardMemory | null {
	if (!isRecord(v)) {
		return null;
	}
	const { shownAt, passes, offUntil } = v;
	const ok =
		(shownAt === null || isTime(shownAt)) && isTime(passes) && isTime(offUntil);
	return ok
		? {
				offUntil: offUntil as number,
				passes: passes as number,
				shownAt: shownAt as number | null,
			}
		: null;
}

export function validKept(stored: unknown): Kept {
	if (!isRecord(stored)) {
		return { ...FRESH, owner: null };
	}
	const { owner, text, forWho, held } = stored;
	const endCard = validEndCard(stored.endCard);
	const ok =
		(owner === null || typeof owner === "string") &&
		isWords(text) &&
		isWords(held) &&
		isFor(forWho) &&
		endCard !== null;
	return ok
		? { endCard, forWho, held, owner, text }
		: { ...FRESH, owner: null };
}

export const keptFor = (k: Kept, owner: string | null): Kept =>
	k.owner === owner ? k : { ...FRESH, owner };

export const withPatch = (
	k: Kept,
	owner: string,
	patch: Partial<Mine>
): Kept => ({ ...keptFor(k, owner), ...patch, owner });

const useKept = create<Kept>()(
	persist((): Kept => ({ ...FRESH, owner: null }), {
		merge: (stored, current) => ({ ...current, ...validKept(stored) }),
		migrate: (stored) => stored as Kept,
		name: "xolace-letters-device",
		storage: createJSONStorage(() => zustandJSONStorage),
		version: VERSION,
	})
);

export function useKeptField<K extends keyof Mine>(key: K): Mine[K] {
	const { userId } = useAuth();
	return useKept((k) => keptFor(k, userId ?? null)[key]);
}

export function useKeep() {
	const { userId } = useAuth();
	const keep = (patch: Partial<Mine>) => {
		if (userId) {
			useKept.setState(withPatch(useKept.getState(), userId, patch));
		}
	};
	return {
		clearDraft: () => keep({ forWho: FRESH.forWho, held: "", text: "" }),
		draftNow: () => keptFor(useKept.getState(), userId ?? null).text,
		keep,
	};
}
