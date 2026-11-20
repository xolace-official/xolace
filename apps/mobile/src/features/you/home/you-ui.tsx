import {
	createContext,
	type ReactNode,
	use,
	useEffect,
	useRef,
	useState,
} from "react";

const RING_MS = 2600;

export type YouTab = "insights" | "follow-ups";

export type YouUiStart = {
	tab?: YouTab;
	tip?: boolean;
	weekRing?: boolean;
	toDays?: boolean;
	toTop?: boolean;
	toWeek?: boolean;
	weekHeld?: number;
};

export type ScrollTarget = "top" | "days" | "week";

type YouUi = {
	tip: { open: boolean; top: number };
	toggleTip: (top: number) => void;
	placeTip: (top: number) => void;
	closeTip: () => void;
	weekRing: boolean;
	tapWeek: () => void;
	scrollTo: { target: ScrollTarget; key: number } | null;
	weekHeld: number | null;

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
