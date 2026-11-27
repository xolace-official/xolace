import { useClerk } from "@clerk/expo";
import { useEffect } from "react";
import { useOnCantReachHelp } from "@/features/launch/use-cant-reach-help";
import { useCantReachXolace } from "@/lib/connection/use-connection";
import { clerkRetryDelay } from "./clerk-retry";

/**
 * Asks for Clerk to be loaded again (`onRetry` remounts `ClerkProvider`) when its launch load
 * failed and Xolace can be reached again. Without it, an offline cold start stays on the launch
 * gate after the connection returns: Clerk's React wrapper keeps "error" for good, so Convex
 * never gets a token. Renders nothing.
 */
export function ClerkLoadRetry({
	onRetry,
	retries,
}: {
	onRetry: () => void;
	retries: number;
}) {
	const failed = useClerk().status === "error";
	const cantReachXolace = useCantReachXolace();
	const readingHelp = useOnCantReachHelp();
	const delay = clerkRetryDelay({
		cantReachXolace,
		failed,
		readingHelp,
		retries,
	});
	useEffect(() => {
		if (delay === null) {
			return;
		}
		const id = setTimeout(onRetry, delay);
		return () => clearTimeout(id);
	}, [delay, onRetry]);
	return null;
}
