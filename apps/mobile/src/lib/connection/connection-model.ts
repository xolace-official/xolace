/** How long a connection must stay down, without a break, before a flag turns on. */
export const CONNECTION_GRACE_MS = 3000;

export type Internet = "online" | "offline" | "unknown";

export type ConnectionStart = {
	foreground: boolean;
	internet: Internet;
	socketConnected: boolean;
};

export type ConnectionEvent =
	| { type: "internet"; internet: Internet }
	| { type: "socket"; connected: boolean }
	| { type: "foreground" }
	| { type: "background" };

/** The two NetInfo readings that matter; `null` (or absent) means it hasn't read them yet. */
export type NetReading = {
	isConnected: boolean | null;
	isInternetReachable?: boolean | null;
};

/** No network, or a network confirmed to have no internet (Wi-Fi that isn't online yet). */
export function internetOf(net: NetReading): Internet {
	if (net.isConnected === false || net.isInternetReachable === false) {
		return "offline";
	}
	if (net.isConnected === true && net.isInternetReachable === true) {
		return "online";
	}
	return "unknown";
}

export type ConnectionFlags = {
	cantReachXolace: boolean;
	offline: boolean;
};

/** The flags as one answer, for copy that names the cause: "offline" only when the device is. */
export type Reach = "reachable" | "offline" | "cant_reach";

export function reachOf(flags: ConnectionFlags): Reach {
	if (flags.offline) {
		return "offline";
	}
	return flags.cantReachXolace ? "cant_reach" : "reachable";
}

/**
 * A condition that counts only once it has held for the grace without a break. Its timer runs
 * only while the app is in the foreground, and starts over when the app comes back.
 */
function graceWatch(isForeground: () => boolean, onHeld: () => void) {
	let down = false;
	let held = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const pause = () => {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
	};
	const restart = () => {
		pause();
		held = false;
		if (down && isForeground()) {
			timer = setTimeout(() => {
				timer = undefined;
				held = true;
				onHeld();
			}, CONNECTION_GRACE_MS);
		}
	};
	return {
		heldDown: () => held,
		pause,
		restart,
		setDown(isDown: boolean) {
			if (isDown !== down) {
				down = isDown;
				restart();
			}
		},
	};
}

export type ConnectionModel = {
	flags: () => ConnectionFlags;
	send: (event: ConnectionEvent) => void;
	/** Called when either flag changes, never for an event that leaves both as they were. */
	subscribe: (listener: () => void) => () => void;
	stop: () => void;
};

/**
 * Two flags from the connection events. offline: the internet has been gone for the grace.
 * Can't reach Xolace: Convex's socket has been down for the grace, or the device is offline.
 */
export function createConnectionModel(start: ConnectionStart): ConnectionModel {
	let foreground = start.foreground;
	const listeners = new Set<() => void>();
	const read = (): ConnectionFlags => ({
		cantReachXolace: socket.heldDown() || internet.heldDown(),
		offline: internet.heldDown(),
	});
	let last: ConnectionFlags = { cantReachXolace: false, offline: false };
	const settle = () => {
		const next = read();
		if (
			next.offline === last.offline &&
			next.cantReachXolace === last.cantReachXolace
		) {
			return;
		}
		last = next;
		for (const listener of listeners) {
			listener();
		}
	};
	const internet = graceWatch(() => foreground, settle);
	const socket = graceWatch(() => foreground, settle);
	const watches = [internet, socket];
	const pauseAll = () => {
		for (const w of watches) {
			w.pause();
		}
	};
	let stopped = false;
	internet.setDown(start.internet === "offline");
	socket.setDown(!start.socketConnected);

	const apply = (event: ConnectionEvent) => {
		switch (event.type) {
			case "internet":
				internet.setDown(event.internet === "offline");
				break;
			case "socket":
				socket.setDown(!event.connected);
				break;
			case "foreground":
				foreground = true;
				for (const w of watches) {
					w.restart();
				}
				break;
			case "background":
				foreground = false;
				pauseAll();
				break;
			default:
				break;
		}
	};

	return {
		flags: () => last,
		send(event) {
			// A source can still answer after stop (NetInfo's first reading is async).
			if (stopped) {
				return;
			}
			apply(event);
			settle();
		},
		stop() {
			stopped = true;
			listeners.clear();
			pauseAll();
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
