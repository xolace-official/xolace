import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
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
import {
	type CommitCause,
	chosen,
	commitStep,
	type FlowStep,
	moveOnLands,
	NO_CHOICES,
	NO_LOCAL,
	putOutStep,
	skipFailed,
	skipStep,
	tendFailed,
	tendStep,
	undoStep,
} from "./trail-flow";

const NO_LEG = -1;
type Timer = ReturnType<typeof setTimeout>;

const sameStates = (a: readonly TwigState[], b: readonly TwigState[]) =>
	a.length === b.length && a.every((s, i) => s === b[i]);

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
	const [local, setLocal] = useState<LocalStates>(NO_LOCAL);
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
		const fresh = effectiveStates(view, NO_LOCAL);
		setForId(view.id);
		setLocal(NO_LOCAL);
		setShown(fresh);
		setOpen(restingCard(fresh));
	}

	// The tend's gold, fading in on its leg (§4's Reduce Motion form; PR 3 runs the spark).
	const fade = { leg: useSharedValue(NO_LEG), t: useSharedValue(1) };
	const latest = useRef({ now, shown, view });
	useEffect(() => {
		latest.current = { now, shown, view };
	});
	// The latest local states for callbacks and timers (state lags a render behind).
	const localRef = useRef<LocalStates>(NO_LOCAL);
	const undoTimer = useRef<Timer | null>(null);
	const stopUndoTimer = () => {
		if (undoTimer.current) {
			clearTimeout(undoTimer.current);
		}
		undoTimer.current = null;
	};
	const apply = (step: FlowStep) => {
		localRef.current = step.local;
		setLocal(step.local);
	};
	const timers = useRef<Timer[]>([]);
	const later = (ms: number, fn: () => void) => {
		timers.current.push(setTimeout(fn, ms));
	};
	const clearLater = () => {
		for (const id of timers.current) {
			clearTimeout(id);
		}
		timers.current = [];
	};
	// Each move-on lands only if no card was chosen since it was scheduled.
	const choices = useRef(NO_CHOICES);
	const choose = () => {
		choices.current = chosen(choices.current);
	};
	const moveOn = (ms: number, ticket = choices.current) =>
		later(ms, () => {
			if (moveOnLands(ticket, choices.current)) {
				setOpen(restingCard(latest.current.now));
			}
		});
	// A new kindling: the old one's undo window closes without sending (its twig is gone), and
	// nothing still pending for it (a move-on, a tend's light) runs.
	useEffect(() => {
		stopUndoTimer();
		clearLater();
		choose();
		localRef.current = NO_LOCAL;
	}, [view.id]);

	/** Light twig i on the trail: its stop, its leg's gold, the count; then the card moves on. */
	const play = (i: number) => {
		// "I did this" plays it itself; the return effect may find it too.
		if (latest.current.shown[i] === "done") {
			return;
		}
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

	/** Send a skip; a refusal puts the twig back. */
	const sendSkip = (id: string | undefined) => {
		if (!id) {
			return;
		}
		k.skip(id).then((ok) => {
			if (!ok) {
				apply(skipFailed(localRef.current, id));
			}
		});
	};
	/** Close the undo window (§8): the skip is sent; the card moves on unless they chose one. */
	const commit = (cause: CommitCause) => {
		stopUndoTimer();
		const step = commitStep(localRef.current, cause);
		if (!step.skip) {
			return;
		}
		apply(step);
		if (step.moveOn) {
			moveOn(SKIP_MOVE_ON_MS);
		}
		sendSkip(step.skip);
	};
	const commitRef = useRef(commit);
	useEffect(() => {
		commitRef.current = commit;
	});
	// Leaving sends a skip still in its window: blur and unmount, and the app going to the
	// background, where JS timers pause and the OS may end the app before the window would.
	useFocusEffect(useCallback(() => () => commitRef.current("left"), []));
	useEffect(() => {
		const sub = AppState.addEventListener("change", (next) => {
			if (next === "background") {
				commitRef.current("left");
			}
		});
		return () => sub.remove();
	}, []);
	useEffect(() => clearLater, []);

	const twigAt = (i: number) => latest.current.view.twigs[i];
	return {
		actions: {
			act: (i: number) => {
				choose();
				commit("chose");
				const twig = twigAt(i);
				if (!twig) {
					return;
				}
				if (twig.kind !== "try") {
					playSoftPress();
					k.open(twig.id, false);
					return;
				}
				// "I did this" is sent at once (a quick Back can't drop it, a second tap sends
				// nothing); it lights after the press, and goes back if the server refuses.
				const step = tendStep(
					localRef.current,
					twig.id,
					latest.current.now[i] === "done"
				);
				if (!step.tend) {
					return;
				}
				playSoftPress();
				apply(step);
				k.tend(twig.id).then((ok) => {
					if (!ok) {
						apply(tendFailed(localRef.current, twig.id));
					}
				});
				later(PRESS_TEND_MS, () => play(i));
			},
			again: (i: number) => {
				choose();
				commit("chose");
				const twig = twigAt(i);
				if (twig) {
					playSoftPress();
					k.open(twig.id, true);
				}
			},
			browse: (i: number) => {
				choose();
				commit("chose");
				const twig = twigAt(i);
				if (twig) {
					playSoftPress();
					k.browse(twig.id);
				}
			},
			openStop: (i: number) => {
				// They chose this card: the skip is sent, and nothing moves the card off it.
				choose();
				commit("chose");
				if (i !== open) {
					playTextureSelect();
					setOpen(i);
				}
			},
			skip: (i: number) => {
				const twig = twigAt(i);
				if (!twig) {
					return;
				}
				choose();
				stopUndoTimer();
				playSoftPress();
				const step = skipStep(localRef.current, twig.id);
				apply(step);
				sendSkip(step.skip);
				undoTimer.current = setTimeout(
					() => commitRef.current("closed"),
					UNDO_MS
				);
			},
			undo: () => {
				choose();
				stopUndoTimer();
				playTextureSelect();
				apply(undoStep(localRef.current));
			},
		},
		fade,
		/**
		 * The ⋯ menu's Put it out (§11.1). While its alert asks, the Undo window waits: nothing
		 * completes the kindling behind it. Confirmed, the pending skip is dropped (the kindling is
		 * going); cancelled, it's sent and the card moves on, as the window closing would.
		 */
		menu: {
			asking: stopUndoTimer,
			cancelled: () => commit("closed"),
			putOut: () => apply(putOutStep(localRef.current)),
		},
		open,
		shown,
	};
}
