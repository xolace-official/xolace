import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, PixelRatio } from "react-native";
import { withTiming } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import { useSkiaBodyFace } from "@/design/skia-face";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { VENT_COPY } from "@/features/vent/copy";
import {
	type FieldPhase,
	useFieldControl,
} from "@/features/vent/field/field-control";
import { ASH_RUN_MS } from "@/features/vent/field/particle-after";
import { COMPRESS_MS } from "@/features/vent/field/particle-config";
import { useDrop } from "@/features/vent/flow/use-drop";
import { useListening } from "@/features/vent/flow/use-listening";
import { useVentSounds } from "@/features/vent/flow/use-vent-sounds";
import { playReply, ventClock } from "@/features/vent/flow/vent-clock";
import { useVentHaptics } from "@/features/vent/flow/vent-haptics";
import type { VentBackend } from "@/features/vent/vent-backend";
import type { Vent, VentPhase } from "@/features/vent/vent-data";
import { replyWords } from "@/features/vent/vent-model";
import { WORD_BURN_MS } from "@/features/vent/words/burn-shader";
import { buildWordLayer } from "@/features/vent/words/word-layer";

/** v2: "Gone." comes up this long after the words start to burn (Reduce Motion: once they fade). */
const GONE_AFTER_MS = WORD_BURN_MS + 500;
const GONE_AFTER_REDUCED_MS = 500;
const REDUCED_OUT_MS = 400;
/** "Gone." in (400), held, out (1000): then the screen closes itself (production). */
const GONE_HOLD_MS = 3400;
const GONE_CAP_HOLD_MS = 5000;
const FRAME_LAG_MS = 100;

/** Where a dev state starts: on the intro or ready, and the field already assembled or blank. */
export type VentSeed = {
	phase?: "intro" | "idle";
	field?: FieldPhase;
	settled?: boolean;
};

const say = (s: string) => AccessibilityInfo.announceForAccessibility(s);

/**
 * Vent v2's choreography over production's state machine: intro → idle → rec → burn → heard →
 * ash → gone, plus the other endings (§12). The backend decides what comes after the burn
 * (`heard` waits for both its end and the server); this decides how it looks and feels. Every
 * per-frame value lives in the field's shared values. `steps` lets a dev state play a stage.
 */
export function useVentFlow(
	backend: VentBackend,
	reduced: boolean,
	seed: VentSeed = {}
) {
	const typeface = useSkiaBodyFace();
	const hap = useVentHaptics();
	const [first] = useState<VentPhase>(
		() => seed.phase ?? (backend.state.introSeen ? "idle" : "intro")
	);
	const field = useFieldControl(
		first === "intro" ? "sparse" : (seed.field ?? "field"),
		seed.settled ?? false,
		backend.state.level
	);
	const [phase, setPhaseState] = useState<VentPhase>(first);
	const [running, setRunning] = useState(true);
	const [starts, setStarts] = useState<number[] | null>(null);
	const phaseRef = useRef(phase);
	const setPhase = (next: VentPhase) => {
		phaseRef.current = next;
		setPhaseState(next);
	};
	// Timers fire after newer renders: they act through the latest backend.
	const latest = useRef(backend);
	useEffect(() => {
		latest.current = backend;
	});
	const act = () => latest.current.actions;
	// Refuses new timers once the screen has gone, so nothing resumes after an await on a
	// screen that is no longer there.
	const [clock] = useState(ventClock);
	const { at, clear } = clock;
	useEffect(() => {
		clock.start();
		return () => clock.stop();
	}, [clock]);
	const releasedAt = useRef(0);
	const reply = backend.state.reply;
	const words = reply ? replyWords(reply.words) : [];
	useVentSounds(phase === "burn", reduced);

	const release = (how: "tap" | "flick" | "ceiling", flx = 0, fly = 0) => {
		if (phaseRef.current !== "rec") {
			return;
		}
		setPhase("burn");
		releasedAt.current = Date.now();
		clear();
		hap.softPress();
		if (!reduced) {
			hap.burn();
		}
		act().stop(how === "ceiling");
		field.go("burn", { flx, fly });
		say(VENT_COPY.said.letting);
	};
	const soon = useListening(
		phase === "rec",
		backend,
		field,
		() => release("ceiling"),
		hap.gentlePresence
	);

	const startRec = async () => {
		const got = await act().start();
		if (!clock.live) {
			// Closed while the mic was starting: nothing is sent, and the take goes.
			if (got === "started") {
				act().drop("unmounted");
			}
			return;
		}
		if (got !== "started") {
			hap.errorNotice();
			return;
		}
		hap.affirmativePress();
		setPhase("rec");
		say(VENT_COPY.said.listening);
	};

	/** Pinch-spread during the gather (production): bursts at once from where it is. */
	const burst = () => {
		if (
			phaseRef.current !== "burn" ||
			reduced ||
			Date.now() - releasedAt.current > COMPRESS_MS
		) {
			return;
		}
		field.pinch.set(1);
		hap.burst();
	};

	const toGone = () => {
		const fromAsh = phaseRef.current === "ash" && !reduced;
		setPhase("gone");
		say(VENT_COPY.gone);
		act().finish();
		// The words' ash outlives "Gone." a little; then the field stops drawing.
		const ashLeft = fromAsh ? WORD_BURN_MS + ASH_RUN_MS - GONE_AFTER_MS : 0;
		if (ashLeft === 0) {
			field.go("none");
		}
		at(ashLeft + FRAME_LAG_MS, () => setRunning(false));
		at(backend.state.capReached ? GONE_CAP_HOLD_MS : GONE_HOLD_MS, () =>
			act().leave()
		);
	};

	const toAsh = () => {
		setPhase("ash");
		// Reduce Motion: no shader, the words fade out together.
		if (reduced) {
			field.wordsShown.set(
				withTiming(0, { duration: REDUCED_OUT_MS, ...PLAY_AS_CHOSEN })
			);
		} else {
			field.go("ash");
		}
		at(reduced ? GONE_AFTER_REDUCED_MS : GONE_AFTER_MS, toGone);
	};

	const afterBurn = async () => {
		field.layer.set(null);
		field.wordsShown.set(1);
		setPhase("heard");
		const crisis = latest.current.state.reply?.crisis ?? false;
		await playReply(words, {
			// The waiting sparks keep rising until the voice starts: never a blank screen.
			begin: (starts) => {
				field.go("none");
				setStarts(starts);
			},
			clock,
			// Crisis keeps its line on screen, with support under it: no burn, no "Gone.".
			end: crisis ? () => act().finish() : toAsh,
			say,
			speak: () => act().speak(),
		});
	};

	// The backend's answer, once the burn has played.
	const stage = backend.state.stage;
	useEffect(() => {
		if (phaseRef.current !== "burn") {
			return;
		}
		if (stage === "heard") {
			afterBurn();
		}
		if (stage === "gone") {
			toGone();
		}
		// Only a new stage moves it on.
	}, [stage]);

	const drop = useDrop(phaseRef, (reason) => {
		clear();
		hap.softPress();
		act().drop(reason);
	});

	const vent: Vent = {
		actions: {
			burst,
			close: () => {
				if (phaseRef.current === "rec") {
					return drop("close");
				}
				clear();
				hap.softPress();
				act().close();
			},
			flick: (x, y) => release("flick", x, y),
			onBurnComplete: () => act().burnt(),
			onWordsLaidOut: (rects, fontSize, lineH) => {
				if (reduced) {
					return;
				}
				const scale = PixelRatio.get();
				scheduleOnUI(() => {
					"worklet";
					field.layer.set(
						buildWordLayer(rects, fontSize, lineH, scale, typeface)
					);
				});
			},
			openSettings: () => act().openSettings(),
			support: () => act().support(),
			tapMic: () => {
				if (phaseRef.current === "rec") {
					return release("tap");
				}
				if (phaseRef.current === "idle") {
					startRec();
				}
			},
			understand: () => {
				hap.softPress();
				act().understand();
				field.go("field");
				setPhase("idle");
			},
		},
		state: {
			capAfter: backend.state.capReached,
			capBefore: backend.state.capBefore,
			crisis: reply?.crisis ?? false,
			field,
			micOff: backend.state.micOff,
			phase,
			reduced,
			reply: { starts, words },
			running,
			soon,
		},
	};
	return {
		steps: { afterBurn, burst, release, startRec, toAsh, toGone },
		vent,
	};
}
