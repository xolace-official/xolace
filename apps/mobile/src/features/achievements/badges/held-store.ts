import type { ViewInstance } from "react-native";
import { create } from "zustand";
import type { NamePt, Pt } from "@/features/achievements/coin/pose";

export type OpenOpts = {
	latest?: boolean;
	below?: boolean;
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
	n: number;
};

type State = {
	out: Out | null;
	shown: Out | null;
	seat: { id: string | null; slot: string; n: number };
};

const FRESH: State = {
	out: null,
	seat: { id: null, n: 0, slot: "" },
	shown: null,
};

export const useHeld = create<State>()(() => FRESH);

export const resetHeld = () => useHeld.setState(FRESH);

export const SLOTS = new Map<string, ViewInstance>();
export const LATEST_SLOT = "latest";

const LABEL_GAP = 6;
const LABEL_LINE = 16;
const ROW_NAME = 11.5 / 30;
const LATEST_NAME = 12.5 / 30;
const LATEST_NAME_D = { x: 144, y: 41 } as const;
const BELOW = { dy: 116, ns: 0.5, ny: 166, r: 70 } as const;
const MIN_Y = 60;
const EDGE = 20;

let opened = 0;

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

export function seated(out: Out) {
	const slot = out.opts.latest ? LATEST_SLOT : out.id;
	const { seat } = useHeld.getState();
	useHeld.setState({
		out: null,
		seat: { id: out.slot ? out.id : null, n: seat.n + 1, slot },
	});
	return SLOTS.get(slot);
}
