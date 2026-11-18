/**
 * What letters keep on the device, never on the server (porting guide, Letters › State):
 *
 * - **The draft**: the words, "For", and the words of a held letter (Send stays off until they
 *   change). It survives leaving the screen, the care sheet and an app restart; only a send
 *   clears it (owner, handoff §7.4). A fixable or at-risk letter leaves nothing on the server.
 * - **The end card's memory**: when the write card last showed, passes running, rest until.
 *
 * Both are the signed-in user's own: a different account on this device starts fresh.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import type { LetterFor } from "./copy";
import { END_CARD_FRESH, type EndCardMemory } from "./letters-model";

type Kept = {
	owner: string | null;
	text: string;
	forWho: LetterFor;
	/** A held letter's words, unchanged: Send stays off for them. */
	held: string;
	endCard: EndCardMemory;
};

const FRESH: Omit<Kept, "owner"> = {
	endCard: END_CARD_FRESH,
	forWho: "Anyone",
	held: "",
	text: "",
};

const useKept = create<Kept>()(
	persist((): Kept => ({ ...FRESH, owner: null }), {
		name: "xolace-letters-device",
		storage: createJSONStorage(() => zustandJSONStorage),
	})
);

/** This user's view of what's kept: another account's draft reads as fresh. */
const mine = (k: Kept, owner: string | null) =>
	k.owner === owner ? k : { ...FRESH, owner };

/** One field of this user's draft or memory; a write to another account's store starts it over. @public Read by the Letters screens (S20 PR 2). */
export function useKeptField<K extends keyof typeof FRESH>(
	owner: string | null,
	key: K
): Kept[K] {
	return useKept((k) => mine(k, owner)[key]);
}

/** @public Read by the Letters screens (S20 PR 2). */
export function keep(owner: string | null, patch: Partial<typeof FRESH>) {
	const k = useKept.getState();
	useKept.setState({ ...mine(k, owner), ...patch, owner });
}

/** Read once, outside render (a starter, Send). @public Read by the Letters screens (S20 PR 2). */
export const keptNow = (owner: string | null) =>
	mine(useKept.getState(), owner);

/** A send clears the draft (and any held words). @public Read by the Letters screens (S20 PR 2). */
export const clearDraft = (owner: string | null) =>
	keep(owner, { forWho: FRESH.forWho, held: "", text: "" });
