import { useEffect } from "react";
import { ageAskTaken, useAgeAsk } from "@/lib/age-ask";
import { useAgeGate } from "./use-age-gate";

export function AgeAskHost() {
	const ask = useAgeAsk((s) => s.ask);
	const gate = useAgeGate(ask?.surface ?? "letters");
	useEffect(() => {
		if (!ask) {
			return;
		}
		ageAskTaken();
		gate.handleRefusal(ask.error, ask.retry);
	}, [ask, gate]);
	return null;
}
