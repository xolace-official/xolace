import type { Id } from "@xolace/backend/dataModel";
import { createContext, type ReactNode, use } from "react";
import type { ReportTo } from "../thread/thread-data";
import { useXolacer } from "./use-xolacer";
import type { ProfileView } from "./xolacer-model";

export type XolacerState =
	| { phase: "loading" }
	/** Unpublished, or never was. */
	| { phase: "gone" }
	| {
			phase: "ready";
			id: Id<"emotional_profiles">;
			photoUrl?: string;
			present: boolean;
			/** Full, or not taking conversations: the avatar steps back. */
			muted: boolean;
			isSelf: boolean;
			view: ProfileView;
			/** Rate, Report, Block in the header; none on your own profile. */
			menu: {
				rate: "hidden" | "prompt" | "rated";
				canBlock: boolean;
			} | null;
			blocking: { open: boolean; pending: boolean; history: boolean };
			/** The route carried a specialty: "Others listen to … too". */
			others: string | null;
			sending: boolean;
			/** The first-ask primer in front of a request, or opened from "What to expect". */
			primer: "gate" | "reference" | null;
	  };

/** Everything a Xolacer's profile reads and does. Convex fills it in the app (`XolacerData`),
 * fixtures in its dev states. */
export type XolacerScreenData = {
	state: XolacerState;
	actions: {
		ask: () => void;
		openChat: () => void;
		rate: () => void;
		report: () => void;
		askBlock: () => void;
		confirmBlock: () => void;
		cancelBlock: () => void;
		edit: () => void;
		others: () => void;
		openPrimer: () => void;
		closePrimer: () => void;
		confirmPrimer: () => void;
	};
};

export type XolacerRoute = {
	profileId: string;
	specialty?: string;
	/** The Kindling twig that led here, tended once a request is sent. */
	stepId?: string;
};

const Context = createContext<XolacerScreenData | null>(null);

export function XolacerProvider({
	value,
	children,
}: {
	value: XolacerScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function XolacerData({
	route,
	reportTo,
	children,
}: {
	route: XolacerRoute;
	reportTo: ReportTo;
	children: ReactNode;
}) {
	return (
		<XolacerProvider value={useXolacer(route, reportTo)}>
			{children}
		</XolacerProvider>
	);
}

export function useXolacerScreen(): XolacerScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useXolacerScreen outside XolacerData");
	}
	return value;
}
