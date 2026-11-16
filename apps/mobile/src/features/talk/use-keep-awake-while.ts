import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect } from "react";

const TAG = "talk";

/** Keeps the screen on while `on` (the talk is in front). */
export function useKeepAwakeWhile(on: boolean) {
	useEffect(() => {
		if (!on) {
			return;
		}
		activateKeepAwakeAsync(TAG).catch(() => undefined);
		return () => {
			deactivateKeepAwake(TAG).catch(() => undefined);
		};
	}, [on]);
}
