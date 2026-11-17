import {
	createContext,
	type ReactNode,
	use,
	useEffect,
	useRef,
	useState,
} from "react";

/** How long tapping the week rings this week's column on Your days. */
const RING_MS = 2600;

export type YouTab = "insights" | "follow-ups";

/** Where a dev state opens the tab: a tab picked, the freeze explanation open, the week ringed. */
export type YouUiStart = {
	tab?: YouTab;
	tip?: boolean;
	weekRing?: boolean;
	/** Scrolled to Your days, the header docked. */
	toDays?: boolean;
	/** Docked at the top of Insights (Steadiness first). */
	toTop?: boolean;
	/** Scrolled to This week. */
	toWeek?: boolean;
	/** This week holding a day (Monday 0). */
	weekHeld?: number;
};

/** Where Insights scrolls to, docked: a card's top under the pills. */
export type ScrollTarget = "top" | "days" | "week";

/**
 * The tab's own UI that several parts share: the freeze explanation (drawn by the screen over
 * the tab bar, placed under the streak card), the week ring on Your days, and the scroll and
 * tab change a tap on the week asks for. Screen state, not data: the dev states pass `start`.
 */
type YouUi = {
	tip: { open: boolean; top: number };
	/** Open at a window y (the streak card's bottom), or close if open. */
	toggleTip: (top: number) => void;
	/** Where the explanation drops, measured as the streak card lays out. */
	placeTip: (top: number) => void;
	closeTip: () => void;
	weekRing: boolean;
	/** The header's week: Insights, scrolled to Your days, this week's column ringed. */
	tapWeek: () => void;
	/** A scroll the Insights tab performs; the key lets the same one repeat. */
	scrollTo: { target: ScrollTarget; key: number } | null;
	/** A day This week opens held on (dev states only). */
	weekHeld: number | null;

	/** A tab the screen switches to, keyed likewise. */
	tab: { name: YouTab; key: number } | null;
};

const UiContext = createContext<YouUi | null>(null);

export function YouUiProvider({
	start,
	children,
}: {
	start?: YouUiStart;
	children: ReactNode;
}) {
	const [tip, setTip] = useState({ open: start?.tip ?? false, top: 0 });
	const [weekRing, setWeekRing] = useState(start?.weekRing ?? false);
	const [scrollTo, setScrollTo] = useState<YouUi["scrollTo"]>(() => {
		const target = startTarget(start);
		return target ? { key: 1, target } : null;
	});
	const [tab, setTab] = useState<YouUi["tab"]>(
		start?.tab ? { key: 0, name: start.tab } : null
	);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);

	const value: YouUi = {
		closeTip: () => setTip((t) => (t.open ? { ...t, open: false } : t)),
		placeTip: (top) => setTip((t) => (t.top === top ? t : { ...t, top })),
		scrollTo,
		tab,
		tapWeek: () => {
			const key = Date.now();
			setTip((t) => ({ ...t, open: false }));
			setTab({ key, name: "insights" });
			setScrollTo({ key, target: "days" });
			setWeekRing(true);
			clearTimeout(timer.current);
			timer.current = setTimeout(() => setWeekRing(false), RING_MS);
		},
		tip,
		toggleTip: (top) => setTip((t) => ({ open: !t.open, top })),
		weekHeld: start?.weekHeld ?? null,
		weekRing,
	};
	return <UiContext value={value}>{children}</UiContext>;
}

function startTarget(start: YouUiStart | undefined): ScrollTarget | null {
	if (start?.toWeek) {
		return "week";
	}
	if (start?.toDays) {
		return "days";
	}
	return start?.toTop ? "top" : null;
}

export function useYouUi(): YouUi {
	const value = use(UiContext);
	if (!value) {
		throw new Error("useYouUi needs a YouUiProvider above it");
	}
	return value;
}
