import type { SkTypeface } from "@shopify/react-native-skia";
import { useEffect, useEffectEvent, useRef, useState } from "react";
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
import { COMPRESS_MS, FLASH_MS } from "@/features/vent/field/particle-config";
import { useCrackle } from "@/features/vent/flow/use-crackle";
import { useDrop } from "@/features/vent/flow/use-drop";
import { useListening } from "@/features/vent/flow/use-listening";
import { playReply, ventClock } from "@/features/vent/flow/vent-clock";
import { useVentHaptics } from "@/features/vent/flow/vent-haptics";
import type { VentBackend } from "@/features/vent/vent-backend";
import type { Vent, VentPhase } from "@/features/vent/vent-data";
import { replyWords } from "@/features/vent/vent-model";
import { WORD_BURN_MS } from "@/features/vent/words/burn-shader";
import { layerBuilder } from "@/features/vent/words/layer-builder";
import {
	buildWordLayer,
	type WordRect,
} from "@/features/vent/words/word-layer";

const GONE_AFTER_MS = WORD_BURN_MS + 500;
const GONE_AFTER_REDUCED_MS = 500;
const REDUCED_OUT_MS = 400;
const GONE_HOLD_MS = 3400;
const GONE_CAP_HOLD_MS = 5000;
const FRAME_LAG_MS = 100;

export type VentSeed = {
	phase?: "intro" | "idle";
	field?: FieldPhase;
	settled?: boolean;
};

type WordLayout = { rects: WordRect[]; fontSize: number; lineH: number };

const say = (s: string) => AccessibilityInfo.announceForAccessibility(s);

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
	const [layers] = useState(() =>
		layerBuilder<WordLayout, SkTypeface>(({ rects, fontSize, lineH }, face) => {
			const scale = PixelRatio.get();
			scheduleOnUI(() => {
				"worklet";
				field.layer.set(buildWordLayer(rects, fontSize, lineH, scale, face));
			});
		})
	);
	useEffect(() => {
		if (typeface) {
			layers.faceLoaded(typeface);
		}
	}, [typeface, layers]);
	const [phase, setPhaseState] = useState<VentPhase>(first);
	const [running, setRunning] = useState(true);
	const [starts, setStarts] = useState<number[] | null>(null);
	const phaseRef = useRef(phase);
	const setPhase = (next: VentPhase) => {
		phaseRef.current = next;
		setPhaseState(next);
	};
	const latest = useRef(backend);
	useEffect(() => {
		latest.current = backend;
	});
	const act = () => latest.current.actions;
	const [clock] = useState(ventClock);
	const { at, clear } = clock;
	useEffect(() => {
		clock.start();
		return () => clock.stop();
	}, [clock]);
	const releasedAt = useRef(0);
	const reply = backend.state.reply;
	const words = reply ? replyWords(reply.words) : [];
	const crackle = useCrackle();

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
		// The crackle lands at the scatter, after the recorder has stopped.
		at(COMPRESS_MS + FLASH_MS, () => crackle(reduced));
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
		if (got === "busy") {
			return;
		}
		if (!clock.live) {
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
		layers.burning();
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
			begin: (starts) => {
				field.go("none");
				setStarts(starts);
			},
			clock,
			end: crisis ? () => act().finish() : toAsh,
			say,
			speak: () => act().speak(),
		});
	};

	const stage = backend.state.stage;
	const onStage = useEffectEvent((next: typeof stage) => {
		if (phaseRef.current !== "burn") {
			return;
		}
		if (next === "heard") {
			afterBurn();
		}
		if (next === "gone") {
			toGone();
		}
	});
	// Only a new stage moves the burn on.
	useEffect(() => {
		onStage(stage);
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
				if (!reduced) {
					layers.laidOut({ fontSize, lineH, rects });
				}
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
