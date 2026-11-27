import { useEffect, useState } from "react";
import { useOnCantReachHelp } from "@/features/launch/use-cant-reach-help";
import { type RootGate, type RootGateInput, rootGate } from "./root-gate";

/**
 * The root gate for this render. Crisis resources hold it only when they were opened from the
 * can't-reach message, never when a link happens to resolve to the same path.
 */
export function useRootGate(
	input: Omit<RootGateInput, "readingHelp">
): RootGate {
	const onHelp = useOnCantReachHelp();
	const [lastGate, setLastGate] = useState<RootGate>("loading");
	const gate = rootGate({
		...input,
		readingHelp: onHelp && lastGate === "(cant-reach)",
	});
	useEffect(() => setLastGate(gate), [gate]);
	return gate;
}
