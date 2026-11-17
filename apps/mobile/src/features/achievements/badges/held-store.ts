/**
 * Which badge is out of its slot, and where it flew from: this screen's UI state,
 * shared by the list's tiles and the badge page. A store rather than the provider
 * so each tile reads one narrow slice and a badge going out re-renders only its
 * own tile (badges §6). Nothing here is server truth; leaving the screen resets it.
 */
import type { ViewInstance } from "react-native";
import { create } from "zustand";
import type { NamePt, Pt } from "@/features/achievements/coin/pose";

/** How a badge comes out: from the sparks card, a row, or from below (no slot). */
export type OpenOpts = {
	latest?: boolean;
	below?: boolean;
	/** A dev state's held frame: no flight, the clock at rest. */
	still?: boolean;
	spin?: number;
	dragY?: number;
};

export type Out = {
	id: string;
	o: Pt;
	no: NamePt;
	opts: OpenOpts;
	slot: boolean;
	/** Bumped on every open, so the page knows a new one started. */
	n: number;
};

type State = {
	out: Out | null;
	/** The badge the page shows: the one out, or the last one (the page stays mounted, hidden). */
	shown: Out | null;
	/** Bumped when a badge seats again: its medallion pops. */
	seat: { id: string | null; slot: string; n: number };
};

const FRESH: State = {
	out: null,
	seat: { id: null, n: 0, slot: "" },
	shown: null,
};

export const useHeld = create<State>()(() => FRESH);

export const resetHeld = () => useHeld.setState(FRESH);

/** The medallions on screen, so a badge can fly from its slot (and VoiceOver can return there). */
export const SLOTS = new Map<string, ViewInstance>();
/** The sparks card's badge has its own slot: the same badge may sit in a row too. */
export const LATEST_SLOT = "latest";

const LABEL_GAP = 6;
const LABEL_LINE = 16;
/** The label's size against the title's (11.5/30 in a row, 12.5/30 in the sparks card). */
const ROW_NAME = 11.5 / 30;
const LATEST_NAME = 12.5 / 30;
/** The sparks card's "Latest: …" line's centre from the 96 pt badge's (board: (88, 221) → (232, 262)). */
const LATEST_NAME_D = { x: 144, y: 41 } as const;
/** No slot: it rises from below the screen (the board's (195, 960), r 70, on an 844 screen). */
const BELOW = { dy: 116, ns: 0.5, ny: 166, r: 70 } as const;
/** A slot this far off the screen's top is under the bar: fly from below instead. */
const MIN_Y = 60;
const EDGE = 20;

let opened = 0;

/**
 * A finger is down on a medallion: the hidden page takes that badge now, so
 * lifting only opens it (the opening commit then carries no content swap).
 */
export function prepareBadge(id: string) {
	const { out, shown } = useHeld.getState();
	if (out || shown?.id === id) {
		return;
	}
	useHeld.setState({
		shown: {
			id,
			n: shown?.n ?? 0,
			no: { s: 1, x: 0, y: 0 },
			o: { r: 0, x: 0, y: 0 },
			opts: {},
			slot: false,
		},
	});
}

/** Measure the slot (if it's on screen), then put the badge out. */
export function openBadge(
	id: string,
	window: { width: number; height: number },
	opts: OpenOpts = {}
) {
	if (useHeld.getState().out) {
		return;
	}
	const { width: W, height: H } = window;
	const put = (out: Out) => useHeld.setState({ out, shown: out });
	const below = () =>
		put({
			id,
			n: ++opened,
			no: { s: BELOW.ns, x: W / 2, y: H + BELOW.ny },
			o: { r: BELOW.r, x: W / 2, y: H + BELOW.dy },
			opts,
			slot: false,
		});
	const view = opts.below
		? undefined
		: SLOTS.get(opts.latest ? LATEST_SLOT : id);
	if (!view) {
		below();
		return;
	}
	view.measureInWindow((x, y, w, h) => {
		const cx = x + w / 2;
		const cy = y + h / 2;
		if (!w || cx < -EDGE || cx > W + EDGE || cy < MIN_Y || cy > H + EDGE) {
			below();
			return;
		}
		const no = opts.latest
			? { s: LATEST_NAME, x: cx + LATEST_NAME_D.x, y: cy + LATEST_NAME_D.y }
			: { s: ROW_NAME, x: cx, y: y + h + LABEL_GAP + LABEL_LINE / 2 };
		put({
			id,
			n: ++opened,
			no,
			o: { r: w / 2, x: cx, y: cy },
			opts,
			slot: true,
		});
	});
}

/** The badge has seated again: nothing is out, and its medallion pops. */
export function seated(out: Out) {
	const slot = out.opts.latest ? LATEST_SLOT : out.id;
	const { seat } = useHeld.getState();
	useHeld.setState({
		out: null,
		seat: { id: out.slot ? out.id : null, n: seat.n + 1, slot },
	});
	return SLOTS.get(slot);
}
