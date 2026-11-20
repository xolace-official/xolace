import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { playSoftPress, playTextureSelect } from "@/lib/haptics";
import { COPY } from "./copy";
import type { Kindling } from "./kindling-data";
import {
	caught,
	effectiveStates,
	followStates,
	freshTends,
	type LocalStates,
	restingCard,
	type TrailView,
	type TwigState,
	tendedCount,
} from "./kindling-model";
import type { Trail } from "./trail/trail-geometry";
import { useTend } from "./trail/use-tend";
import {
	type CommitCause,
	catchesInPlace,
	commitStep,
	type FlowStep,
	holdFor,
	letGo,
	NO_HOLD,
	NO_LOCAL,
	NOT_HELD,
	putOutStep,
	skipFailed,
	skipStep,
	tendFailed,
	tendPlays,
	tendRun,
	tendStep,
	undoStep,
} from "./trail-flow";
import { SKIP_MOVE_ON_MS, trailSchedule, UNDO_MS } from "./trail-schedule";

type Timer = ReturnType<typeof setTimeout>;

const sameStates = (a: readonly TwigState[], b: readonly TwigState[]) =>
	a.length === b.length && a.every((s, i) => s === b[i]);

type Args = {
	trail: Trail;
	reduced: boolean;
	live: boolean;
};

export function useTrail(
	view: TrailView,
	k: Kindling["actions"],
	{ trail, reduced, live }: Args
) {
	const focused = useIsFocused();
	const [local, setLocal] = useState<LocalStates>(NO_LOCAL);
	const now = effectiveStates(view, local);
	const [forId, setForId] = useState(view.id);
	const [shown, setShown] = useState(now);
	const [open, setOpen] = useState(() => restingCard(now));
	const [held, setHeld] = useState(NOT_HELD);
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
		setHeld(NOT_HELD);
	}

	const tend = useTend({
		live,
		reduced,
		trail,
		waiting: shown.includes("wait"),
	});
	const latest = useRef({ now, shown, view });
	useEffect(() => {
		latest.current = { now, shown, view };
	});
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
	const tendRef = useRef(tend);
	const playRef = useRef<
		(i: number, last: boolean, landed: () => void) => void
	>(() => undefined);
	const [schedule] = useState(() =>
		trailSchedule({
			clearTimeout: (id) => clearTimeout(id),
			moveCard: () => setOpen(restingCard(latest.current.now)),
			play: (i, last, landed) => playRef.current(i, last, landed),
			resetTend: () => tendRef.current.reset(),
			setTimeout: (fn, ms) => setTimeout(fn, ms),
		})
	);
	useEffect(() => {
		stopUndoTimer();
		schedule.newKindling();
		localRef.current = NO_LOCAL;
	}, [view.id]);

	const play = (i: number, last: boolean, landed: () => void) => {
		if (!tendPlays(latest.current.shown, latest.current.now, i)) {
			return;
		}
		const run = tendRun(latest.current.now, i, last);
		setShown((s) => s.map((x, j) => (j === i ? "done" : x)));
		setHeld((h) => holdFor(h, i, run));
		AccessibilityInfo.announceForAccessibility(
			COPY.a11y.announce(tendedCount(run.after), run.after.length)
		);
		tend.tend(i, run.toFire, () => {
			setHeld((h) => letGo(h, i));
			landed();
		});
	};
	useEffect(() => {
		playRef.current = play;
		tendRef.current = tend;
	});
	const refuse = (i: number, id: string) => {
		apply(tendFailed(localRef.current, id));
		tend.cancel(i);
		setHeld((h) => letGo(h, i));
	};

	const key = `${view.id}:${now.join()}`;
	useEffect(() => {
		if (!focused) {
			schedule.blur();
			return;
		}
		return schedule.playBatch(
			freshTends(latest.current.shown, latest.current.now)
		);
		// The plays read the latest through refs; re-run when the states or focus change.
	}, [focused, key]);

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
	const commit = (cause: CommitCause) => {
		stopUndoTimer();
		const step = commitStep(localRef.current, cause);
		if (!step.skip) {
			return;
		}
		apply(step);
		if (step.moveOn) {
			schedule.moveOn(SKIP_MOVE_ON_MS);
		}
		if (catchesInPlace(latest.current.view, step, cause)) {
			tend.catchInPlace();
		}
		sendSkip(step.skip);
	};
	const commitRef = useRef(commit);
	useEffect(() => {
		commitRef.current = commit;
	});
	useFocusEffect(useCallback(() => () => commitRef.current("left"), []));
	useEffect(() => {
		const sub = AppState.addEventListener("change", (next) => {
			if (next === "background") {
				commitRef.current("left");
			}
		});
		return () => sub.remove();
	}, []);
	useEffect(() => schedule.dispose, []);

	const twigAt = (i: number) => latest.current.view.twigs[i];
	return {
		actions: {
			act: (i: number) => {
				schedule.choose();
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
						refuse(i, twig.id);
					}
				});
				schedule.press(i);
			},
			again: (i: number) => {
				schedule.choose();
				commit("chose");
				const twig = twigAt(i);
				if (twig) {
					playSoftPress();
					k.open(twig.id, true);
				}
			},
			browse: (i: number) => {
				schedule.choose();
				commit("chose");
				const twig = twigAt(i);
				if (twig) {
					playSoftPress();
					k.browse(twig.id);
				}
			},
			openStop: (i: number) => {
				schedule.choose();
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
				schedule.choose();
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
				schedule.choose();
				stopUndoTimer();
				playTextureSelect();
				apply(undoStep(localRef.current));
			},
		},
		bound: caught(shown),
		caught: caught(shown) && held.heading === NO_HOLD,
		hold: held.hold,
		menu: {
			asking: stopUndoTimer,
			cancelled: () => commit("closed"),
			putOut: () => apply(putOutStep(localRef.current)),
		},
		open,
		shown,
		tend,
	};
}
