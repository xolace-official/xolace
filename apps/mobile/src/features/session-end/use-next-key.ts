import { useEffect, useRef, useState } from "react";
import type { SessionEnd } from "./session-end-data";
import { type NextKey, nextKey } from "./session-end-model";

/**
 * The next step moment 2 shows. It's chosen as moment 2 opens and then kept, so
 * a card never changes under the reader; only a pending listener match may
 * still resolve (loading, for up to 2 s), once.
 */
export function useNextKey({
	session,
	moment,
	late,
	step,
}: {
	session: SessionEnd;
	moment: 1 | 2;
	late: boolean;
	step: number | null;
}): NextKey {
	const [kept, setKept] = useState<NextKey | null>(null);
	const live = nextKey({ ...session.state.slot, late, step });
	if (moment === 2 && kept === null && live !== "loading") {
		setKept(live);
	}
	// Once per key: the provider's actions are rebuilt each render.
	const shown = useRef(session.actions.nextShown);
	useEffect(() => {
		shown.current = session.actions.nextShown;
	});
	useEffect(() => {
		if (kept !== null) {
			shown.current(kept);
		}
	}, [kept]);
	return kept ?? live;
}
