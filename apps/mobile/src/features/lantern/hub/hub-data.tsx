import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { createContext, type ReactNode, use } from "react";
import { useHub } from "@/features/lantern/hub/use-hub";
import type { EntryActions } from "@/features/lantern/use-entry-actions";

export type HubView = NonNullable<
	FunctionReturnType<typeof api.library.hubs.getHub>
>;
export type HubTrack = Extract<
	HubView["items"][number],
	{ kind: "audio" }
>["track"];

/**
 * A listen inside a hub plays through the app's one now-playing track, which Lantern doesn't
 * own: the route hands it in (`HubData`'s `listen`), so Lantern never imports the player.
 */
export type HubListen = {
	/** A free listener: Xolace+ tracks are locked. */
	locked: boolean;
	/** The slug loaded in the mini player, if any. */
	nowPlaying: string | null;
	playing: boolean;
	/** Plays a track here, no navigation: resumes it if it's loaded, loads it if not; locked,
	 * the paywall. */
	play: (track: HubTrack) => void;
	/** Pauses what's playing. */
	toggle: () => void;
	/** The card itself: plays it if it isn't playing, then the full player; locked, the paywall. */
	open: (track: HubTrack) => void;
};

/** A hub: its cover, title, intro and items. Convex in the app, fixtures in its dev states. */
export type Hub = {
	state: {
		/** undefined while it loads, null once it's been put away. */
		hub: HubView | null | undefined;
		listen: Omit<HubListen, "play" | "toggle" | "open">;
	};
	actions: EntryActions & Pick<HubListen, "play" | "toggle" | "open">;
};

const HubContext = createContext<Hub | null>(null);

export function HubProvider({
	value,
	children,
}: {
	value: Hub;
	children: ReactNode;
}) {
	return <HubContext value={value}>{children}</HubContext>;
}

/** The app's adapter: `getHub`, the save and share actions, and the route's player. */
export function HubData({
	slug,
	listen,
	children,
}: {
	slug: string;
	listen: HubListen;
	children: ReactNode;
}) {
	return <HubProvider value={useHub(slug, listen)}>{children}</HubProvider>;
}

export function useHubScreen(): Hub {
	const value = use(HubContext);
	if (!value) {
		throw new Error("useHubScreen needs a HubProvider above it");
	}
	return value;
}
