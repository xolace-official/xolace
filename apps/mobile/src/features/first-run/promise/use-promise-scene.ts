import { useEffect } from "react";
import type { SharedValue } from "react-native-reanimated";
import { DRIFT, type PEng } from "./promise-scene";

/** Dev states: the opening, the hand-off or a named card held at an age (ms). */
export type PromiseScene = {
	at?: number;
	handoffAt?: number;
	account?: boolean;
	namedAt?: number;
};

/** A held opening's marquee has drifted this far, at most. */
const HELD_DRIFT_MS = 6000;
const MS = 1000;

/** A dev state's held moment, written into the engine once it mounts. */
export function usePromiseScene(
	eng: SharedValue<PEng>,
	scene: PromiseScene | undefined
) {
	const handoffAt = scene?.handoffAt ?? -1;
	const account = scene?.account ?? false;
	const namedAt = scene?.namedAt ?? -1;
	useEffect(() => {
		eng.modify((e) => {
			"worklet";
			if (e.hold >= 0 && !e.rm) {
				e.off += (DRIFT * Math.min(e.hold, HELD_DRIFT_MS)) / MS;
			}
			if (handoffAt >= 0) {
				e.xHold = handoffAt;
				e.tx = 0;
				e.acct = account;
			}
			if (namedAt >= 0) {
				e.ni = 0;
				e.nHold = namedAt;
			}
			return e;
		});
	}, [eng, handoffAt, account, namedAt]);
}
