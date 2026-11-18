/**
 * What letters keep on the device, never on the server (porting guide, Letters › State):
 *
 * - **The draft**: the words, "For", and the words of a held letter (Send stays off until they
 *   change). It survives leaving the screen, the care sheet and an app restart; only a send
 *   clears it (owner, handoff §7.4). A fixable or at-risk letter leaves nothing on the server.
 * - **The end card's memory**: when the write card last showed, passes running, rest until.
 *
 * Both are the signed-in user's own: the hooks read who that is, and a different account on
 * this device starts fresh (its first write replaces the last account's). Signed out, nothing
 * is written. What's read back from storage is checked field by field; anything malformed
 * starts fresh rather than, say, hiding the write card for good.
 */
import { useAuth } from "@clerk/expo";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import { FOR, LETTER_MAX, type LetterFor } from "./copy";
import { END_CARD_FRESH, type EndCardMemory } from "./letters-model";

type Mine = {
	text: string;
	forWho: LetterFor;
	/** A held letter's words, unchanged: Send stays off for them. */
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

/** The stored shape. Bump it, with a `migrate`, when `Kept` changes. */
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

/** What storage held, checked: anything malformed is a fresh start with no owner. */
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

/** This user's view of what's kept: another account's draft reads as fresh. */
export const keptFor = (k: Kept, owner: string | null): Kept =>
	k.owner === owner ? k : { ...FRESH, owner };

/** A write as this user: it starts from fresh when the store was another account's. */
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

/** One field of the signed-in user's draft or memory. */
export function useKeptField<K extends keyof Mine>(key: K): Mine[K] {
	const { userId } = useAuth();
	return useKept((k) => keptFor(k, userId ?? null)[key]);
}

/**
 * Writes for the signed-in user. A send clears the draft (and any held words). Signed out,
 * they do nothing.
 */
export function useKeep() {
	const { userId } = useAuth();
	const keep = (patch: Partial<Mine>) => {
		if (userId) {
			useKept.setState(withPatch(useKept.getState(), userId, patch));
		}
	};
	return {
		clearDraft: () => keep({ forWho: FRESH.forWho, held: "", text: "" }),
		keep,
	};
}
