import { createContext, type ReactNode, use } from "react";
import { usePaywall } from "@/features/purchases/use-paywall";
import type { LinkStep } from "@/features/reach-me-on/link-flow";
import type { Channel, ChannelEntry } from "@/features/reach-me-on/reach-view";
import { useReachChannels } from "@/features/reach-me-on/use-reach-channels";
import { useTelegramLink } from "@/features/reach-me-on/use-telegram-link";
import type { Reach } from "@/lib/connection/connection-model";
import { useReach } from "@/lib/connection/use-connection";

export type ReachSheet = {
	state: {
		channels: readonly ChannelEntry[] | undefined;
		reach: Reach;
		link: { step: LinkStep; minting: boolean };
	};
	actions: {
		tryFirst: (channel: Channel) => void;
		setPaused: (channel: Channel, paused: boolean) => void;
		unlink: (channel: Channel) => void;
		getPlus: () => void;
		link: {
			start: () => void;
			openTelegram: () => void;
			copyLink: () => void;
			cancel: () => void;
			dismiss: () => void;
		};
	};
};

const ReachSheetContext = createContext<ReachSheet | null>(null);

export function ReachSheetProvider({
	value,
	children,
}: {
	value: ReachSheet;
	children: ReactNode;
}) {
	return <ReachSheetContext value={value}>{children}</ReachSheetContext>;
}

export function ReachSheetData({ children }: { children: ReactNode }) {
	const { channels, ...channelActions } = useReachChannels();
	const reach = useReach();
	const { step, minting, ...link } = useTelegramLink(
		channels?.find((c) => c.channel === "telegram")
	);
	const openPaywall = usePaywall((s) => s.open);
	const value: ReachSheet = {
		actions: {
			...channelActions,
			getPlus: () => openPaywall("reach_telegram"),
			link,
		},
		state: { channels, link: { minting, step }, reach },
	};
	return <ReachSheetProvider value={value}>{children}</ReachSheetProvider>;
}

export function useReachSheet(): ReachSheet {
	const sheet = use(ReachSheetContext);
	if (!sheet) {
		throw new Error("useReachSheet needs a ReachSheetProvider above it");
	}
	return sheet;
}
