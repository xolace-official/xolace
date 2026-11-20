import { api } from "@xolace/backend/convex/_generated/api";
import { useEffect, useState } from "react";
import { useStableQuery } from "@/lib/convex/use-stable-query";
import { WEEKLY_TALK_S } from "@/lib/talk/talk-time";
import { useTimeLeft } from "@/lib/talk/use-time-left";

const HOUR_MS = 60 * 60 * 1000;

export function useTalkTime(enabled = true) {
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
	if (time && expired) {
		return { secondsLeft: WEEKLY_TALK_S, settling: false };
	}
	return time;
}
