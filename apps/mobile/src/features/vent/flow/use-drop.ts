import { type RefObject, useEffect, useRef } from "react";
import { AppState, BackHandler } from "react-native";
import type { VentPhase } from "@/features/vent/vent-data";

type DropReason = "close" | "background";

/**
 * v2 (§12): leaving mid-recording drops the take, never sends it. The X calls the returned
 * `drop`; going to the background and Android's back button drop it too. The phase leaves "rec"
 * first, so neither a tap nor the ceiling can let a dropped take go while the recorder stops.
 */
export function useDrop(
	phase: RefObject<VentPhase>,
	onDrop: (reason: DropReason) => void
) {
	const latest = useRef(onDrop);
	useEffect(() => {
		latest.current = onDrop;
	});
	const drop = (reason: DropReason) => {
		phase.current = "gone";
		latest.current(reason);
	};
	useEffect(() => {
		const sub = AppState.addEventListener("change", (next) => {
			if (next === "background" && phase.current === "rec") {
				drop("background");
			}
		});
		const back = BackHandler.addEventListener("hardwareBackPress", () => {
			if (phase.current !== "rec") {
				return false;
			}
			drop("close");
			return true;
		});
		return () => {
			sub.remove();
			back.remove();
		};
	});
	return drop;
}
