import { createContext, type ReactNode, use, useState } from "react";
import { Presets } from "react-native-pulsar";
import {
	type Domain,
	type PartView,
	tapOf,
} from "@/features/you/steadiness/steadiness-model";
import { playSoftPress } from "@/lib/haptics";

export type PartsView = "grid" | "list";

/** Where a dev state opens the screen. */
export type SteadinessStart = {
	view?: PartsView;
	/** Xolace+: the part in the detail card, or the list row open. */
	picked?: Domain;
	open?: Domain;
	/** Free: the ring tapped, its locked detail showing. */
	peek?: Domain;
	/** Scrolled down to the parts. */
	toParts?: boolean;
};

/** The screen's own state its parts share: which view, which part, which row is open. */
type SteadinessUi = {
	view: PartsView;
	picked: Domain | null;
	open: Domain | null;
	peek: Domain | null;
	toParts: boolean;
	setView: (view: PartsView) => void;
	tap: (part: PartView, plus: boolean, current: Domain | null) => void;
};

const Context = createContext<SteadinessUi | null>(null);

export function SteadinessUiProvider({
	start,
	children,
}: {
	start?: SteadinessStart;
	children: ReactNode;
}) {
	const [view, setViewState] = useState<PartsView>(start?.view ?? "grid");
	const [picked, setPicked] = useState<Domain | null>(start?.picked ?? null);
	const [open, setOpen] = useState<Domain | null>(start?.open ?? null);
	const [peek, setPeek] = useState<Domain | null>(start?.peek ?? null);
	const value: SteadinessUi = {
		open,
		peek,
		picked,
		setView: (next) => {
			Presets.System.selection();
			setViewState(next);
			setOpen(null);
		},
		/** `current`: the part the detail card shows now, so picking it again does nothing. */
		tap: (part, plus, current) => {
			switch (tapOf(part, plus, view)) {
				case "select":
					if (part.domain !== current) {
						Presets.flick();
						setPicked(part.domain);
					}
					return;
				case "toggle-open":
					if (open !== part.domain) {
						Presets.flick();
					}
					setOpen(open === part.domain ? null : part.domain);
					return;
				case "toggle-peek":
					if (peek !== part.domain) {
						playSoftPress();
					}
					setPeek(peek === part.domain ? null : part.domain);
					return;
				default:
					return;
			}
		},
		toParts: start?.toParts ?? false,
		view,
	};
	return <Context value={value}>{children}</Context>;
}

export function useSteadinessUi(): SteadinessUi {
	const value = use(Context);
	if (!value) {
		throw new Error("useSteadinessUi outside SteadinessUiProvider");
	}
	return value;
}
