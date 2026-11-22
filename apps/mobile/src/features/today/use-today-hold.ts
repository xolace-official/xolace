import { useNetInfo } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { TODAY_HOLD_MS, todayHolds } from "./today-model";

export function useTodayHolds(ready: boolean): boolean {
	// `isConnected` is null until NetInfo's first read: only a definite false is offline.
	const offline = useNetInfo().isConnected === false;
	const [over, setOver] = useState(false);
	useEffect(() => {
		const id = setTimeout(() => setOver(true), TODAY_HOLD_MS);
		return () => clearTimeout(id);
	}, []);
	return todayHolds({
		offline,
		ready,
		waitedMs: over ? TODAY_HOLD_MS : 0,
	});
}
