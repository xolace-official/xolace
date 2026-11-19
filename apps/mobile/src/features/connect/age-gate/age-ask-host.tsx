import { useEffect } from "react";
import { ageAskTaken, useAgeAsk } from "@/lib/age-ask";
import { AgeGateSheet } from "./age-gate-sheet";
import { useAgeGate } from "./use-age-gate";

/**
 * The age gate for a feature that can't draw it (Letters' opt-in and send, `@/lib/age-ask`):
 * kept above the stack, it opens the same sheet a Xolacer request does, declaring for that
 * feature's surface.
 */
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
	return <AgeGateSheet gate={gate} />;
}
