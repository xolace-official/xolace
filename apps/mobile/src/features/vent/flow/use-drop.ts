import { type RefObject, useEffect, useEffectEvent } from "react";
import { AppState, BackHandler } from "react-native";
import type { VentPhase } from "@/features/vent/vent-data";

type DropReason = "close" | "background";

export function useDrop(
	phaseRef: RefObject<VentPhase>,
	onDrop: (reason: DropReason) => void
) {
	const drop = (reason: DropReason) => {
		phaseRef.current = "gone";
		onDrop(reason);
	};
	const dropFromSystem = useEffectEvent(drop);
	useEffect(() => {
		const sub = AppState.addEventListener("change", (next) => {
			if (next === "background" && phaseRef.current === "rec") {
				dropFromSystem("background");
			}
		});
		const back = BackHandler.addEventListener("hardwareBackPress", () => {
			if (phaseRef.current !== "rec") {
				return false;
			}
			dropFromSystem("close");
			return true;
		});
		return () => {
			sub.remove();
			back.remove();
		};
	}, [phaseRef]);
	return drop;
}
