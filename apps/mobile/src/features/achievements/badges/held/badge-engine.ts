import { type RefObject, useEffect, useRef, useState } from "react";
import {
	AccessibilityInfo,
	findNodeHandle,
	type TextInstance,
	type ViewInstance,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
	type SharedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { longDate } from "@/features/achievements/achievements-model";
import {
	beginClose,
	type Engine,
	EV,
	poseAt,
	step,
	tapTurn,
} from "@/features/achievements/badges/badge-pose";
import type { BadgeView } from "@/features/achievements/badges/badges-model";
import { type Out, seated } from "@/features/achievements/badges/held-store";
import {
	HELD_R,
	type Pose,
	REST_POSE,
} from "@/features/achievements/coin/pose";
import { COPY } from "@/features/achievements/copy";
import { useLater } from "@/features/achievements/later";
import { playAffirmativePress, playErrorNotice, tap } from "@/lib/haptics";

/** The board's phone: positions are from its top, on a 54 pt status bar. */
const BOARD_STATUS = 54;
const HELD_Y = 400;
const TITLE_Y = 134;
/** A still state (a dev state's held frame) starts this far in. */
const STILL_AGE = 5000;
const MAX_DT = 64;
const AXIS_LOCK = 10;
const TAP_MS = 350;
/** A pan from the left edge puts the badge back instead of leaving the screen. */
const EDGE = 24;
const EDGE_CLOSE = 60;
const EDGE_SPEED = 500;
const CLOSE_PAST = 90;
const CLOSE_SPEED = 700;
/** Pulled down: `300 · (1 − e^(−dy/300))`; pushed up, a stiff 14 pt at most. */
const PULL = 300;
const PULL_UP = 14;
const PULL_UP_SOFT = 40;
const FOCUS_MS = 60;
/** The pan's axis: undecided, turning, pulling, refused (locked or reduced), the left edge. */
const AXIS = { edge: 4, none: 0, pull: 2, refused: 3, turn: 1 } as const;

/** Where the page puts things on this screen: the board's tops shifted by the status bar. */
export const geo = (top: number, width: number) => {
	const dy = top - BOARD_STATUS;
	return { dy, hx: width / 2, hy: HELD_Y + dy, ty: TITLE_Y + dy };
};

function fresh(
	out: Out,
	g: ReturnType<typeof geo>,
	locked: boolean,
	reduced: boolean
): Engine {
	const still = out.opts.still === true;
	return {
		at: 0,
		back: false,
		backAt: 0,
		backFrom: 0,
		cp: null,
		dragging: false,
		dragY: out.opts.dragY ?? 0,
		from: 0,
		held: { r: HELD_R, x: g.hx, y: g.hy },
		landed: still,
		locked,
		mode: still || locked || reduced ? "rest" : "launch",
		no: out.no,
		now: 0,
		o: out.o,
		phase: "open",
		rattleAt: -1,
		reduced,
		spin: out.opts.spin ?? 0,
		still,
		t0: still ? -STILL_AGE : 0,
		tc: 0,
		titleY: g.ty,
		to: 0,
		touchAt: 0,
		v: 0,
	};
}

type Args = {
	out: Out | null;
	badge: BadgeView | undefined;
	open: boolean;
	pose: SharedValue<Pose>;
	/** The safe area's top and the window's width, for `geo`. */
	top: number;
	width: number;
	reduced: boolean;
	/** The title, for VoiceOver focus as the badge comes out. */
	title: RefObject<TextInstance | null>;
};

/**
 * One clock while a badge is out (native-cook's use-vault-motion): a frame
 * callback steps the engine on the UI thread and writes the pose. React hears
 * landing, faces, rattles and seating. The page stays mounted; each open (a new
 * `out.n`) starts a fresh engine and the clock.
 */
export function useBadgeEngine({
	out,
	badge,
	open,
	pose,
	top,
	width,
	reduced,
	title,
}: Args) {
	const locked = badge?.earnedAt === undefined;
	const eng = useSharedValue<Engine | null>(null);
	const cur = useRef({ badge, out });
	const later = useLater();
	const focus = (node: ViewInstance | TextInstance | null) =>
		later(() => focusNow(node), FOCUS_MS);
	useEffect(() => {
		cur.current = { badge, out };
	});
	// The open whose clock has stopped (idle or seated); a touch or a new open restarts it.
	const [stopped, setStopped] = useState(0);
	const running = open && out !== null && stopped !== out.n;

	function onEvent(ev: number) {
		const { badge: b, out: o } = cur.current;
		if (!o) {
			return;
		}
		if (ev === EV.landed && b?.earnedAt !== undefined) {
			playAffirmativePress();
			AccessibilityInfo.announceForAccessibility(
				COPY.badge.landed(b.title, b.copy, longDate(b.earnedAt), b.sparks)
			);
		} else if (ev === EV.faced) {
			tap();
		} else if (ev === EV.seated) {
			setStopped(o.n);
			pose.set(REST_POSE);
			if (o.slot) {
				tap();
			}
			focus(seated(o) ?? null);
		} else if (ev === EV.idle) {
			setStopped(o.n);
		}
	}

	const clock = useFrameCallback((f) => {
		const dt = Math.min(MAX_DT, f.timeSincePreviousFrame ?? 0);
		let ev: number = EV.none;
		eng.modify((e) => {
			"worklet";
			if (!e) {
				return e;
			}
			const r = step(e, dt);
			pose.set(r.pose);
			ev = r.ev;
			return e;
		});
		if (ev !== EV.none) {
			scheduleOnRN(onEvent, ev);
		}
	}, false);

	useEffect(() => {
		clock.setActive(running);
	}, [running, clock]);

	// A new badge out: a fresh engine, its first pose, focus on the title.
	const n = open && out ? out.n : 0;
	useEffect(() => {
		const o = cur.current.out;
		if (!(n && o)) {
			return;
		}
		const locked = cur.current.badge?.earnedAt === undefined;
		const e = fresh(o, geo(top, width), locked, reduced);
		eng.set(e);
		pose.set(poseAt(e, o.opts.still ? STILL_AGE : 0));
		const id = setTimeout(() => focusNow(title.current), FOCUS_MS);
		return () => clearTimeout(id);
	}, [n, top, width, reduced, eng, pose, title]);

	const wake = () => setStopped(0);
	const close = () => {
		wake();
		scheduleOnUI(() => {
			"worklet";
			eng.modify((e) => {
				"worklet";
				if (e) {
					beginClose(e);
				}
				return e;
			});
		});
	};
	const turn = () => {
		wake();
		scheduleOnUI(() => {
			"worklet";
			let result: ReturnType<typeof tapTurn> = null;
			eng.modify((e) => {
				"worklet";
				result = e ? tapTurn(e) : null;
				return e;
			});
			if (result === "rattle") {
				scheduleOnRN(playErrorNotice);
			} else if (result === "faced") {
				scheduleOnRN(tap);
			}
		});
	};
	return { close, gestures: useGestures(eng, wake), locked, turn };
}

function focusNow(node: ViewInstance | TextInstance | null) {
	const tag = node ? findNodeHandle(node) : null;
	if (tag) {
		AccessibilityInfo.setAccessibilityFocus(tag);
	}
}

/**
 * Pan (axis lock after 10 pt: sideways turns, down puts back, from the left
 * edge goes back) and tap. The React Compiler keeps them across renders, so a
 * new badge doesn't reconfigure the native handlers.
 */
function useGestures(eng: SharedValue<Engine | null>, wake: () => void) {
	const axis = useSharedValue<number>(AXIS.none);
	const touched = () => {
		"worklet";
		eng.modify((e) => {
			"worklet";
			if (e) {
				e.touchAt = e.now;
			}
			return e;
		});
		scheduleOnRN(wake);
	};
	const pan = Gesture.Pan()
		.minDistance(AXIS_LOCK)
		.onBegin(touched)
		.onStart((ev) => {
			const side = Math.abs(ev.translationX) > Math.abs(ev.translationY);
			const startX = ev.absoluteX - ev.translationX;
			let rattled = false;
			eng.modify((e) => {
				"worklet";
				if (!e || e.phase !== "open") {
					axis.set(AXIS.none);
					return e;
				}
				e.touchAt = e.now;
				if (e.mode === "launch" && e.cp) {
					e.spin = e.cp.spin;
					e.mode = "rest";
				}
				if (side && startX < EDGE && ev.translationX > 0) {
					axis.set(AXIS.edge);
				} else if (side && (e.locked || e.reduced)) {
					if (e.locked) {
						e.rattleAt = e.now;
						rattled = true;
					}
					axis.set(AXIS.refused);
				} else if (side) {
					axis.set(AXIS.turn);
					e.mode = "drag";
					e.from = e.spin;
				} else {
					axis.set(AXIS.pull);
					e.dragging = true;
					e.back = false;
				}
				return e;
			});
			if (rattled) {
				scheduleOnRN(playErrorNotice);
			}
		})
		.onUpdate((ev) => {
			const a = axis.get();
			if (a !== AXIS.turn && a !== AXIS.pull) {
				return;
			}
			eng.modify((e) => {
				"worklet";
				if (!e) {
					return e;
				}
				e.touchAt = e.now;
				if (a === AXIS.turn) {
					e.spin = e.from + (ev.translationX / (2 * HELD_R)) * Math.PI;
				} else {
					const dy = ev.translationY;
					e.dragY =
						dy > 0
							? PULL * (1 - Math.exp(-dy / PULL))
							: -PULL_UP * (1 - Math.exp(dy / PULL_UP_SOFT));
				}
				return e;
			});
		})
		.onEnd((ev) => {
			const a = axis.get();
			axis.set(AXIS.none);
			eng.modify((e) => {
				"worklet";
				if (!e) {
					return e;
				}
				e.touchAt = e.now;
				if (a === AXIS.turn) {
					e.v = (ev.velocityX / (2 * HELD_R)) * Math.PI;
					e.mode = "free";
				} else if (a === AXIS.pull) {
					e.dragging = false;
					if (e.dragY > CLOSE_PAST || ev.velocityY > CLOSE_SPEED) {
						beginClose(e);
					} else {
						e.back = true;
						e.backFrom = e.dragY;
						e.backAt = e.now;
					}
				} else if (
					a === AXIS.edge &&
					(ev.translationX > EDGE_CLOSE || ev.velocityX > EDGE_SPEED)
				) {
					beginClose(e);
				}
				return e;
			});
		});
	const tapGesture = Gesture.Tap()
		.maxDuration(TAP_MS)
		.maxDistance(AXIS_LOCK)
		.onBegin(touched)
		.onEnd((_ev, ok) => {
			if (!ok) {
				return;
			}
			let result: ReturnType<typeof tapTurn> = null;
			eng.modify((e) => {
				"worklet";
				result = e ? tapTurn(e) : null;
				return e;
			});
			if (result === "rattle") {
				scheduleOnRN(playErrorNotice);
			} else if (result === "faced") {
				scheduleOnRN(tap);
			}
		});
	return { pan, tap: tapGesture };
}
