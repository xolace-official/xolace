import { useEffect } from "react";
import { usePlayer, usePlayerClock } from "../player-data";
import type { Playhead } from "./use-playhead";

export function PlayheadSync({ head }: { head: Playhead }) {
	const { position, duration } = usePlayerClock();
	const { actions } = usePlayer();
	useEffect(() => {
		const at = actions.settled(position);
		head.progress.set(duration > 0 ? Math.min(1, at / duration) : 0);
	}, [position, duration, head, actions]);
	return null;
}
