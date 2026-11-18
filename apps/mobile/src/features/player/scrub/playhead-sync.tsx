import { useEffect } from "react";
import { usePlayerClock } from "../player-data";
import type { Playhead } from "./use-playhead";

/** Moves the playhead with the clock. The one part that renders on every status tick; it
 * draws nothing. */
export function PlayheadSync({ head }: { head: Playhead }) {
	const { position, duration } = usePlayerClock();
	useEffect(() => {
		head.progress.set(duration > 0 ? Math.min(1, position / duration) : 0);
	}, [position, duration, head]);
	return null;
}
