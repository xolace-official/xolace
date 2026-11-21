import { useEffect, useEffectEvent, useRef, useState } from "react";

const COLD_START_WAIT_MS = 45_000;

type Args = {
	waiting: boolean;
	start: () => Promise<unknown>;
};

/** Asks the backend for a first quote while there is none, once per visit and again on Try again. */
export function useColdStart({ waiting, start }: Args) {
	const [coldError, setColdError] = useState(false);
	const issued = useRef(false);

	const kick = () => {
		issued.current = true;
		start().catch((e: unknown) => {
			console.error("[quotes] cold start failed", e);
			setColdError(true);
		});
	};
	const kickOnDisplay = useEffectEvent(kick);
	useEffect(() => {
		if (waiting && !issued.current) {
			kickOnDisplay();
		}
	}, [waiting]);

	useEffect(() => {
		if (!waiting || coldError) {
			return;
		}
		const t = setTimeout(() => setColdError(true), COLD_START_WAIT_MS);
		return () => clearTimeout(t);
	}, [waiting, coldError]);

	return {
		coldError,
		retry: () => {
			setColdError(false);
			if (waiting) {
				kick();
			} else {
				issued.current = false;
			}
		},
	};
}
