import { createContext, type ReactNode, use } from "react";
import type { Channel, ChannelEntry } from "@/features/reach-me-on/reach-view";
import { useOffline } from "@/features/reach-me-on/use-offline";
import { useReachChannels } from "@/features/reach-me-on/use-reach-channels";

/**
 * What the "Reach me on…" sheet reads and changes. Two adapters fill it: Convex
 * in the app (`ReachSheetData`) and fixtures in its dev states (`dev/states.tsx`),
 * so the sheet draws the same either way.
 */
export type ReachSheet = {
	state: {
		/** `listChannels` in sheet order; undefined while it loads. */
		channels: readonly ChannelEntry[] | undefined;
		offline: boolean;
	};
	actions: {
		tryFirst: (channel: Channel) => void;
		setPaused: (channel: Channel, paused: boolean) => void;
		unlink: (channel: Channel) => void;
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

/** The app's adapter: the sheet on Convex. */
export function ReachSheetData({ children }: { children: ReactNode }) {
	const { channels, ...actions } = useReachChannels();
	const offline = useOffline();
	return (
		<ReachSheetProvider value={{ actions, state: { channels, offline } }}>
			{children}
		</ReachSheetProvider>
	);
}

export function useReachSheet(): ReachSheet {
	const sheet = use(ReachSheetContext);
	if (!sheet) {
		throw new Error("useReachSheet needs a ReachSheetProvider above it");
	}
	return sheet;
}
