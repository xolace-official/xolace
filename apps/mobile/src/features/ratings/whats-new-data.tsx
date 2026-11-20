import { createContext, type ReactNode, use } from "react";
import type { Release } from "@/lib/release-notes";
import { useWhatsNew } from "./use-whats-new";

/** What's New: one release's notes, and where Continue goes. */
export type WhatsNew = {
	state: { entry: Release };
	actions: {
		/** On to the rating screen when a plain open has it due, otherwise closes. */
		continue: () => void;
	};
};

const WhatsNewContext = createContext<WhatsNew | null>(null);

export function WhatsNewProvider({
	value,
	children,
}: {
	value: WhatsNew;
	children: ReactNode;
}) {
	return <WhatsNewContext value={value}>{children}</WhatsNewContext>;
}

export function useWhatsNewScreen(): WhatsNew {
	const value = use(WhatsNewContext);
	if (!value) {
		throw new Error("useWhatsNewScreen needs a WhatsNewProvider");
	}
	return value;
}

export function WhatsNewData({ children }: { children: ReactNode }) {
	return <WhatsNewProvider value={useWhatsNew()}>{children}</WhatsNewProvider>;
}
