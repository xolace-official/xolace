import { createContext, type ReactNode, use } from "react";
import type {
	DialView,
	Domain,
	PartView,
} from "@/features/you/steadiness/steadiness-model";
import { useSteadiness } from "@/features/you/steadiness/use-steadiness";

/**
 * Everything the Steadiness screen reads and does. Convex fills it in the app
 * (`SteadinessData`), fixtures in its dev states. Undefined state means still loading.
 */
export type SteadinessScreenData = {
	state:
		| {
				/** Xolace+'s numbers: the server's Xolace+ view. */
				plus: boolean;
				/** Free, and the store agrees: the locked chip, Unlock numbers, the locked cards. Off
				 * for Xolace+, and while a new purchase hasn't reached the server (free view, no doors). */
				doors: boolean;
				now: Date;
				dial: DialView;
				/** Live first, quiet next, warming last (the server's order). */
				parts: PartView[];
				/** Free: the part that's been heavier lately, held for the visit. */
				upsell: { domain: Domain } | null;
		  }
		| undefined;
	actions: {
		/** The face sheet. */
		faceInfo: () => void;
		kindling: () => void;
		/** Free: the locked chip, Unlock numbers and the locked detail. */
		numbers: () => void;
		upsell: () => void;
		/** The heavier-lately line came on screen. */
		upsellSeen: () => void;
	};
};

const Context = createContext<SteadinessScreenData | null>(null);

export function SteadinessProvider({
	value,
	children,
}: {
	value: SteadinessScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function SteadinessData({ children }: { children: ReactNode }) {
	return (
		<SteadinessProvider value={useSteadiness()}>{children}</SteadinessProvider>
	);
}

export function useSteadinessScreen(): SteadinessScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useSteadinessScreen outside SteadinessData");
	}
	return value;
}
