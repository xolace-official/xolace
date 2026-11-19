import { useState } from "react";
import { useKeep, useKeptField } from "../device-memory";
import {
	type EndCardOffer,
	endCardOffer,
	endCardPassed,
	endCardShown,
	endCardTaken,
} from "../letters-model";
import { openLetter, openWrite } from "../letters-routes";
import { useLettersStatus } from "../use-letters-data";

/**
 * Letters at a session end (handoff §2), for the session end's route to compose in: what letters
 * may offer this visit, and what showing, passing and taking the write card does to its memory
 * on the device. The session end owns the order (its `nextKey`) and the cards' words.
 */
export function useEndLetters() {
	const status = useLettersStatus();
	const memory = useKeptField("endCard");
	const { keep } = useKeep();
	// A session end is one short visit: its "last 7 days" is read once, as it opens.
	const [openedAt] = useState(Date.now);
	return {
		offer: (safeguard: boolean): EndCardOffer | undefined =>
			status && endCardOffer(status, memory, safeguard, openedAt),
		openRead: () => {
			if (status?.unopenedId) {
				openLetter(status.unopenedId);
			}
		},
		openWrite: () => {
			keep({ endCard: endCardTaken(memory) });
			openWrite();
		},
		writePassed: () => keep({ endCard: endCardPassed(memory, Date.now()) }),
		writeShown: () => keep({ endCard: endCardShown(memory, Date.now()) }),
	};
}
