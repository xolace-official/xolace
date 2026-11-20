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

export function useEndLetters() {
	const status = useLettersStatus();
	const received = useReceivedLetters();
	const [readId, setReadId] = useState<string | null>(null);
	const memory = useKeptField("endCard");
	const { keep } = useKeep();
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
