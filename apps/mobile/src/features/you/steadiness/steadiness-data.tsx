import { createContext, type ReactNode, use } from "react";
import type {
	DialView,
	Domain,
	PartView,
} from "@/features/you/steadiness/steadiness-model";
import { useSteadiness } from "@/features/you/steadiness/use-steadiness";

export type SteadinessScreenData = {
	state:
		| {
				plus: boolean;
				doors: boolean;
				now: Date;
				dial: DialView;
				parts: PartView[];
				upsell: { domain: Domain } | null;
		  }
		| undefined;
	actions: {
		faceInfo: () => void;
		kindling: () => void;
		numbers: () => void;
		upsell: () => void;
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
