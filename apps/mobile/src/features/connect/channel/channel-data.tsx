import { createContext, type ReactNode, use } from "react";
import type { ChannelState } from "./channel-model";
import { useChannel } from "./use-channel";

/** Everything the Xolace channel reads and does. Stream fills it in the app (`ChannelData`),
 * fixtures in its dev states. Reactions and the hold menu are Stream's, per message. */
export type ChannelScreenData = {
	state: ChannelState;
	actions: { retry: () => void };
};

const Context = createContext<ChannelScreenData | null>(null);

export function ChannelProvider({
	value,
	children,
}: {
	value: ChannelScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function ChannelData({ children }: { children: ReactNode }) {
	return <ChannelProvider value={useChannel()}>{children}</ChannelProvider>;
}

export function useChannelScreen(): ChannelScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useChannelScreen outside ChannelData");
	}
	return value;
}
