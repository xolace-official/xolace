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

export type HubListen = {
	locked: boolean;
	nowPlaying: string | null;
	playing: boolean;
	play: (track: HubTrack) => void;
	toggle: () => void;
	open: (track: HubTrack) => void;
};

export type Hub = {
	state: {
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
