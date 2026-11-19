import { useState } from "react";
import { useKeep, useKeptField } from "../device-memory";
import {
	type EndCardOffer,
	endCardOffer,
	endCardPassed,
	endCardShown,
	endCardTaken,
	readTarget,
} from "../letters-model";
import { openLetter, openLetters, openWrite } from "../letters-routes";
import { useLettersStatus, useReceivedLetters } from "../use-letters-data";

/**
 * Letters at a session end (handoff §2), for the session end's route to compose in: what letters
 * may offer this visit, and what showing, passing and taking the write card does to its memory
 * on the device. The session end owns the order (its `nextKey`) and the cards' words.
 */
export function useEndLetters() {
	const status = useLettersStatus();
	const received = useReceivedLetters();
	// The waiting letter as the card was kept: the card stays all visit, the live one moves on.
	const [readId, setReadId] = useState<string | null>(null);
	const memory = useKeptField("endCard");
	const { keep } = useKeep();
	// A session end is one short visit: its "last 7 days" is read once, as it opens.
	const [openedAt] = useState(Date.now);
	return {
		offer: (safeguard: boolean): EndCardOffer | undefined =>
			status && endCardOffer(status, memory, safeguard, openedAt),
		openRead: () => {
			const id = readTarget(readId ?? status?.unopenedId ?? null, received);
			if (id) {
				openLetter(id);
			} else {
				openLetters();
			}
		},
		openWrite: () => {
			keep({ endCard: endCardTaken(memory) });
			openWrite();
		},
		readShown: () => setReadId(status?.unopenedId ?? null),
		writePassed: () => keep({ endCard: endCardPassed(memory, Date.now()) }),
		writeShown: () => keep({ endCard: endCardShown(memory, Date.now()) }),
	};
}
