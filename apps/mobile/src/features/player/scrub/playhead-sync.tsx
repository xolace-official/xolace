import { useEffect } from "react";
import { usePlayer, usePlayerClock } from "../player-data";
import type { Playhead } from "./use-playhead";

/** Moves the playhead with the clock, holding a seek's target until the seek lands. The one
 * part that renders on every status tick; it draws nothing. */
export function PlayheadSync({ head }: { head: Playhead }) {
	const { position, duration } = usePlayerClock();
	const { actions } = usePlayer();
	useEffect(() => {
		const at = actions.settled(position);
		head.progress.set(duration > 0 ? Math.min(1, at / duration) : 0);
	}, [position, duration, head, actions]);
	return null;
}
