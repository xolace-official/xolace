// This week's talk time (#596) for the door, consent card, mirror and settings.

import { api } from "@xolace/backend/convex/_generated/api";
import { useEffect, useState } from "react";
import { WEEKLY_TALK_S } from "@/features/talk/talk-copy";
import { useTimeLeft } from "@/features/talk/use-time-left";
import { useStableQuery } from "@/lib/convex/use-stable-query";

const HOUR_MS = 60 * 60 * 1000;

/** Undefined while loading or skipped, null off Plus. */
export function useTalkTime(enabled = true) {
	// A query mustn't read the clock, so it gets `now` and only re-runs when
	// that changes: re-sent once the answer's week has ended. Stable so the
	// old answer holds while the new week's loads.
	const [now, setNow] = useState(Date.now);
	const time = useStableQuery(api.talk.time.left, enabled ? { now } : "skip");
	const expired = useTimeLeft(time?.resetsAt ?? null, HOUR_MS) === 0;
	useEffect(() => {
		if (!expired) {
			return;
		}
		const id = setTimeout(() => setNow(Date.now()), 0);
		return () => clearTimeout(id);
	}, [expired]);
	// Until it lands, the server tops up to a full week on the next write.
	if (time && expired) {
		return { secondsLeft: WEEKLY_TALK_S, settling: false };
	}
	return time;
}
