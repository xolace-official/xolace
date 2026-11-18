import { createContext, type ReactNode, use } from "react";
import type { ChatRowView, Segment } from "./list/chats-model";
import type { DeleteConfirm, RowActions } from "./list/row-actions";
import type { RosterView } from "./roster/roster";
import type { RosterCard } from "./roster/roster-model";
import { useConnect } from "./use-connect";

/** Where Connect's routed params point it (a notification, a Kindling twig, a decline). */
export type ConnectRoute = {
	specialty?: string;
	view?: string;
	/** The tap's timestamp: a second tap with the same params still lands. */
	navToken?: string;
	/** The Kindling twig that sent us, carried to the profile. */
	stepId?: string;
};

export type ConnectState =
	| { phase: "loading" }
	/** The chat kill switch is off. */
	| { phase: "disabled" }
	| {
			phase: "ready";
			segment: Segment;
			/** The channel, then the active chats. */
			rows: ChatRowView[];
			archivedCount: number;
			/** No active pair chat: none yet, or every one archived. */
			empty: "none" | "archived" | null;
			roster: RosterView;
			/** A Xolacer whose profile isn't published yet. */
			setupBanner: boolean;
			/** A published Xolacer's way to their own profile; paused draws a moon. */
			myProfile: { paused: boolean } | null;
	  };

/** Everything Connect reads and does. Convex and Stream fill it in the app (`ConnectData`),
 * fixtures in its dev states. */
export type ConnectScreenData = {
	state: ConnectState;
	deleting: DeleteConfirm;
	actions: RowActions & {
		setSegment: (segment: Segment) => void;
		setFilter: (slug: string | null) => void;
		openArchived: () => void;
		openXolacer: (card: RosterCard) => void;
		openSetup: () => void;
		openMyProfile: () => void;
	};
};

const Context = createContext<ConnectScreenData | null>(null);

export function ConnectProvider({
	value,
	children,
}: {
	value: ConnectScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function ConnectData({
	route,
	children,
}: {
	route: ConnectRoute;
	children: ReactNode;
}) {
	return (
		<ConnectProvider value={useConnect(route)}>{children}</ConnectProvider>
	);
}

export function useConnectScreen(): ConnectScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useConnectScreen outside ConnectData");
	}
	return value;
}
