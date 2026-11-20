import { createContext, type ReactNode, use } from "react";
import type { ChannelState } from "./channel-model";
import { useChannel } from "./use-channel";

export type ChannelScreenData = {
	state: ChannelState;
	actions: {
		openHelp: () => void;
		retry: () => void;
	};
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
