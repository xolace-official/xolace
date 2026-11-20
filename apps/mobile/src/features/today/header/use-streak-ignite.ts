import { useEffect, useEffectEvent, useRef, useState } from "react";

export const SETTLE_MS = 450;
export const ROLL_AFTER_MS = 150;

type Ignite = {
	igniteKey: number;
	count: number;
	focused: boolean;
	play: () => void;
};

/**
 * Plays a new `igniteKey` once Today is focused, then rolls the shown count. The ignite counts
 * as seen only when it plays: leaving inside the settle plays it on return.
 */
export function useStreakIgnite({
	igniteKey,
	count,
	focused,
	play,
}: Ignite): number {
	const seen = useRef(igniteKey);
	const [shown, setShown] = useState(count);
	const ignite = useEffectEvent(play);

	useEffect(() => {
		if (!focused) {
			return;
		}
		if (igniteKey === seen.current) {
			setShown(count);
			return;
		}
		const timers = [
			setTimeout(() => {
				seen.current = igniteKey;
				ignite();
			}, SETTLE_MS),
			setTimeout(() => setShown(count), SETTLE_MS + ROLL_AFTER_MS),
		];
		return () => {
			for (const id of timers) {
				clearTimeout(id);
			}
		};
	}, [igniteKey, focused, count]);

	return shown;
}
