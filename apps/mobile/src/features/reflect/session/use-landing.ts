import { useEffect, useState } from "react";
import { LAND_MS, MIN_WAIT_MS, type ReflectStage } from "../reflect-model";

type Hold = "wait" | "land" | null;

export function useLanding(stage: ReflectStage): ReflectStage {
	const [hold, setHold] = useState<Hold>(null);
	const [prev, setPrev] = useState(stage);
	const [waitStarted, setWaitStarted] = useState(() =>
		stage === "wait" ? Date.now() : 0
	);

	if (stage !== prev) {
		setPrev(stage);
		if (stage === "wait") {
			setWaitStarted(Date.now());
		}
		if (prev === "wait" && stage === "mirror") {
			setHold("wait");
		} else if (stage !== "mirror") {
			setHold(null);
		}
	}

	useEffect(() => {
		if (hold === "wait") {
			const left = Math.max(0, MIN_WAIT_MS - (Date.now() - waitStarted));
			const t = setTimeout(() => setHold("land"), left);
			return () => clearTimeout(t);
		}
		if (hold === "land") {
			const t = setTimeout(() => setHold(null), LAND_MS);
			return () => clearTimeout(t);
		}
	}, [hold, waitStarted]);

	return hold ?? stage;
}
