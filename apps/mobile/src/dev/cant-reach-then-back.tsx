import { type ReactNode, useEffect, useState } from "react";
import type {
	ConnectionFlags,
	ConnectionModel,
} from "@/lib/connection/connection-model";
import { ConnectionContext } from "@/lib/connection/use-connection";

const AWAY_MS = 5000;
const CANT_REACH: ConnectionFlags = { cantReachXolace: true, offline: false };
const REACHABLE: ConnectionFlags = { cantReachXolace: false, offline: false };
const noop = () => undefined;

function scriptedConnection(): ConnectionModel & { back: () => void } {
	let flags = CANT_REACH;
	const listeners = new Set<() => void>();
	return {
		back() {
			flags = REACHABLE;
			for (const listener of listeners) {
				listener();
			}
		},
		flags: () => flags,
		send: noop,
		stop: noop,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

/**
 * For a dev state: Xolace can't be reached for `awayMs`, then it can, and `children(back)`
 * lands the screen's data. Shows the end-of-loading message and its recovery in one run.
 */
export function CantReachThenBack({
	awayMs = AWAY_MS,
	children,
}: {
	awayMs?: number;
	children: (back: boolean) => ReactNode;
}) {
	const [connection] = useState(scriptedConnection);
	const [back, setBack] = useState(false);
	useEffect(() => {
		const id = setTimeout(() => {
			connection.back();
			setBack(true);
		}, awayMs);
		return () => clearTimeout(id);
	}, [awayMs, connection]);
	return (
		<ConnectionContext value={connection}>{children(back)}</ConnectionContext>
	);
}
