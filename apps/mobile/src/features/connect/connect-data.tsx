import { createContext, type ReactNode, use } from "react";
import type { ChatRowView, Segment } from "./list/chats-model";
import type { DeleteConfirm, RowActions } from "./list/row-actions";
import type { RosterView } from "./roster/roster";
import type { RosterCard } from "./roster/roster-model";
import { useConnect } from "./use-connect";

export type ConnectRoute = {
	specialty?: string;
	view?: string;
	navToken?: string;
	stepId?: string;
};

export type ConnectState =
	| { phase: "loading"; segment: Segment }
	/** The chat kill switch is off. */
	| { phase: "disabled" }
	| {
			phase: "ready";
			segment: Segment;
			rows: ChatRowView[];
			archivedCount: number;
			empty: "none" | "archived" | null;
			roster: RosterView;
			setupBanner: boolean;
			myProfile: { paused: boolean } | null;
	  };

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
