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
};

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
	/** A scroll to Your days the Insights tab performs; the key lets the same one repeat. */
	scrollToDays: number;
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
	const [scrollToDays, setScrollToDays] = useState(start?.toDays ? 1 : 0);
	const [tab, setTab] = useState<YouUi["tab"]>(
		start?.tab ? { key: 0, name: start.tab } : null
	);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);

	const value: YouUi = {
		closeTip: () => setTip((t) => (t.open ? { ...t, open: false } : t)),
		placeTip: (top) => setTip((t) => (t.top === top ? t : { ...t, top })),
		scrollToDays,
		tab,
		tapWeek: () => {
			const key = Date.now();
			setTip((t) => ({ ...t, open: false }));
			setTab({ key, name: "insights" });
			setScrollToDays(key);
			setWeekRing(true);
			clearTimeout(timer.current);
			timer.current = setTimeout(() => setWeekRing(false), RING_MS);
		},
		tip,
		toggleTip: (top) => setTip((t) => ({ open: !t.open, top })),
		weekRing,
	};
	return <UiContext value={value}>{children}</UiContext>;
}

export function useYouUi(): YouUi {
	const value = use(UiContext);
	if (!value) {
		throw new Error("useYouUi needs a YouUiProvider above it");
	}
	return value;
}
