import { useEffect, useEffectEvent, useRef } from "react";

type Args = {
	tickKey: number;
	glad: () => void;
	rest: () => void;
	gladMs: number;
};

/**
 * A ticked row makes the face glad, then it settles back to rest. Only a new tick restarts that:
 * the face's callbacks change with the motion setting, and must not cancel the way back to rest.
 */
export function useTickPose({ tickKey, glad, rest, gladMs }: Args) {
	const seen = useRef(tickKey);
	const onTick = useEffectEvent(glad);
	const onRest = useEffectEvent(rest);
	useEffect(() => {
		if (tickKey === seen.current) {
			return;
		}
		seen.current = tickKey;
		onTick();
		const id = setTimeout(onRest, gladMs);
		return () => clearTimeout(id);
	}, [tickKey, gladMs]);
}
