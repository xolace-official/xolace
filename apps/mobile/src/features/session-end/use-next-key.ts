import { useEffect, useEffectEvent, useState } from "react";
import type { SessionEnd } from "./session-end-data";
import { type NextKey, nextKey } from "./session-end-model";

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
	const shown = useEffectEvent(session.actions.nextShown);
	useEffect(() => {
		if (kept !== null) {
			shown(kept);
		}
	}, [kept]);
	return kept ?? live;
}
