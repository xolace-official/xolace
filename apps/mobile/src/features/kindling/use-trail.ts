import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { playSoftPress, playTextureSelect } from "@/lib/haptics";
import { COPY } from "./copy";
import type { Kindling } from "./kindling-data";
import {
	effectiveStates,
	followStates,
	freshTends,
	type LocalStates,
	restingCard,
	type TrailView,
	type TwigState,
	tendedCount,
} from "./kindling-model";
import {
	KMOTION,
	MOVE_ON_MS,
	PRESS_TEND_MS,
	SETTLE_MS,
	SKIP_MOVE_ON_MS,
	STAGGER_MS,
	UNDO_MS,
} from "./kindling-motion";

const EMPTY: LocalStates = {
	skipped: new Set(),
	tended: new Set(),
	undo: null,
};
const NO_LEG = -1;
type Timer = ReturnType<typeof setTimeout>;

const sameStates = (a: readonly TwigState[], b: readonly TwigState[]) =>
	a.length === b.length && a.every((s, i) => s === b[i]);
const plus = (set: ReadonlySet<string>, id: string) => new Set([...set, id]);
const minus = (set: ReadonlySet<string>, id: string) =>
	new Set([...set].filter((x) => x !== id));

/**
 * The kindling screen's own state (handoff §1, §3, §7, §8): what the stops show (`shown`, which
 * trails the server while a tend plays), the open card, and the undo window. A twig tended
 * since the stops last showed it plays once, 450 ms after focus, 300 ms apart (§7).
 */
export function useTrail(
	view: TrailView,
	k: Kindling["actions"],
	reduced: boolean
) {
	const focused = useIsFocused();
	const [local, setLocal] = useState<LocalStates>(EMPTY);
	const now = effectiveStates(view, local);
	const [forId, setForId] = useState(view.id);
	const [shown, setShown] = useState(now);
	const [open, setOpen] = useState(() => restingCard(now));
	// A new kindling (a fresh session replaced this one): start over, playing nothing.
	if (forId === view.id) {
		const followed = followStates(shown, now);
		if (!sameStates(followed, shown)) {
			setShown(followed);
		}
	} else {
		const fresh = effectiveStates(view, EMPTY);
		setForId(view.id);
		setLocal(EMPTY);
		setShown(fresh);
		setOpen(restingCard(fresh));
	}

	// The tend's gold, fading in on its leg (§4's Reduce Motion form; PR 3 runs the spark).
	const fade = { leg: useSharedValue(NO_LEG), t: useSharedValue(1) };
	const latest = useRef({ now, shown, view });
	useEffect(() => {
		latest.current = { now, shown, view };
	});
	const undoing = useRef<string | null>(null);
	const undoTimer = useRef<Timer | null>(null);
	const timers = useRef<Timer[]>([]);
	const later = (ms: number, fn: () => void) => {
		timers.current.push(setTimeout(fn, ms));
	};
	const moveOn = (ms: number) =>
		later(ms, () => setOpen(restingCard(latest.current.now)));

	/** Light twig i on the trail: its stop, its leg's gold, the count; then the card moves on. */
	const play = (i: number) => {
		const after = latest.current.now.map((s, j) => (j === i ? "done" : s));
		setShown((s) => s.map((x, j) => (j === i ? "done" : x)));
		fade.leg.set(i);
		fade.t.set(0);
		fade.t.set(
			withTiming(1, {
				duration: reduced ? REDUCED_FADE_MS : KMOTION.goldMs,
				...PLAY_AS_CHOSEN,
			})
		);
		AccessibilityInfo.announceForAccessibility(
			COPY.a11y.announce(tendedCount(after), after.length)
		);
		moveOn(KMOTION.goldMs + MOVE_ON_MS);
	};

	// Coming back (or the server catching up): what was tended elsewhere plays, in trail order.
	const key = `${view.id}:${now.join()}`;
	useEffect(() => {
		if (!focused) {
			return;
		}
		const fresh = freshTends(latest.current.shown, latest.current.now);
		const ids = fresh.map((i, n) =>
			setTimeout(() => play(i), SETTLE_MS + n * STAGGER_MS)
		);
		return () => {
			for (const id of ids) {
				clearTimeout(id);
			}
		};
		// `play` reads the latest through refs; re-run when the states or focus change.
	}, [focused, key]);

	/** Close the undo window: the skip is sent, and the card moves on (§8). */
	const commit = () => {
		if (undoTimer.current) {
			clearTimeout(undoTimer.current);
		}
		undoTimer.current = null;
		const id = undoing.current;
		if (!id) {
			return;
		}
		undoing.current = null;
		setLocal((l) => ({ ...l, skipped: plus(l.skipped, id), undo: null }));
		moveOn(SKIP_MOVE_ON_MS);
		k.skip(id).then((ok) => {
			if (!ok) {
				setLocal((l) => ({ ...l, skipped: minus(l.skipped, id) }));
			}
		});
	};
	const commitRef = useRef(commit);
	useEffect(() => {
		commitRef.current = commit;
	});
	// Leaving the screen sends a skip still in its undo window.
	useFocusEffect(useCallback(() => () => commitRef.current(), []));
	useEffect(
		() => () => {
			for (const id of timers.current) {
				clearTimeout(id);
			}
		},
		[]
	);

	const twigAt = (i: number) => latest.current.view.twigs[i];
	return {
		actions: {
			act: (i: number) => {
				commit();
				const twig = twigAt(i);
				if (!twig) {
					return;
				}
				playSoftPress();
				if (twig.kind !== "try") {
					k.open(twig.id, false);
					return;
				}
				// "I did this" lights at once; the server confirms, or it goes back.
				later(PRESS_TEND_MS, () => {
					setLocal((l) => ({ ...l, tended: plus(l.tended, twig.id) }));
					play(i);
					k.tend(twig.id).then((ok) => {
						if (!ok) {
							setLocal((l) => ({ ...l, tended: minus(l.tended, twig.id) }));
						}
					});
				});
			},
			again: (i: number) => {
				commit();
				const twig = twigAt(i);
				if (twig) {
					playSoftPress();
					k.open(twig.id, true);
				}
			},
			browse: (i: number) => {
				commit();
				const twig = twigAt(i);
				if (twig) {
					playSoftPress();
					k.browse(twig.id);
				}
			},
			openStop: (i: number) => {
				commit();
				if (i !== open) {
					playTextureSelect();
					setOpen(i);
				}
			},
			skip: (i: number) => {
				commit();
				const twig = twigAt(i);
				if (!twig) {
					return;
				}
				playSoftPress();
				undoing.current = twig.id;
				setLocal((l) => ({ ...l, undo: twig.id }));
				undoTimer.current = setTimeout(() => commitRef.current(), UNDO_MS);
			},
			undo: () => {
				if (undoTimer.current) {
					clearTimeout(undoTimer.current);
				}
				undoTimer.current = null;
				undoing.current = null;
				playTextureSelect();
				setLocal((l) => ({ ...l, undo: null }));
			},
		},
		commit,
		fade,
		open,
		shown,
	};
}
