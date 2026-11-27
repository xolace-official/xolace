import NetInfo from "@react-native-community/netinfo";
import { useConvex } from "convex/react";
import { type ReactNode, useEffect, useState } from "react";
import { AppState } from "react-native";
import {
	type ConnectionModel,
	createConnectionModel,
	internetOf,
} from "./connection-model";
import { ConnectionContext } from "./use-connection";

/**
 * Feeds the app's one connection model from NetInfo, Convex's socket and AppState. Sits inside
 * the Convex provider. A model is made per mount, so a remount (Strict Mode) starts clean.
 */
export function ConnectionProvider({ children }: { children: ReactNode }) {
	const convex = useConvex();
	const [model, setModel] = useState<ConnectionModel | null>(null);

	useEffect(() => {
		let background = AppState.currentState === "background";
		const next = createConnectionModel({
			foreground: !background,
			// NetInfo hands its listener the current reading as soon as it is added.
			internet: "unknown",
			socketConnected: convex.connectionState().isWebSocketConnected,
		});
		const stopNet = NetInfo.addEventListener((net) =>
			next.send({ internet: internetOf(net), type: "internet" })
		);
		const stopSocket = convex.subscribeToConnectionState((state) =>
			next.send({ connected: state.isWebSocketConnected, type: "socket" })
		);
		// Only a real return from the background restarts the timers: iOS passes through
		// "inactive" for Control Center and the app switcher without leaving.
		const app = AppState.addEventListener("change", (state) => {
			if (state === "background" && !background) {
				background = true;
				next.send({ type: "background" });
			} else if (state === "active" && background) {
				background = false;
				next.send({ type: "foreground" });
			}
		});
		setModel(next);
		return () => {
			stopNet();
			stopSocket();
			app.remove();
			next.stop();
		};
	}, [convex]);

	return <ConnectionContext value={model}>{children}</ConnectionContext>;
}
