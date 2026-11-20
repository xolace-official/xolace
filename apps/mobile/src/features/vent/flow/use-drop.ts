import { type RefObject, useEffect, useRef } from "react";
import { AppState, BackHandler } from "react-native";
import type { VentPhase } from "@/features/vent/vent-data";

type DropReason = "close" | "background";

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
