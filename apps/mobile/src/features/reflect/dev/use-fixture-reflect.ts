import { REFINEMENT_MAX_TURNS } from "@xolace/backend/shared";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { COPY } from "../copy";
import type { Reflect, ReflectUi } from "../reflect-data";
import {
	LAND_MS,
	mirrorSentences,
	pairPhrases,
	resourceRows,
} from "../reflect-model";
import { MAX_TEXTURES } from "../texture-sets";
import {
	type Answer,
	HEAVY_MIRROR_TEXT,
	MIRROR_TEXT,
	RESOURCES,
	REVISED_TEXT,
	SPOKEN,
	STREAK,
	TIMES,
} from "./fixtures";

type S = Reflect["state"];
export type FixtureState = Omit<S, "yourWords" | "mirror" | "resources"> & {
	answer: Answer;
	sent: string;
	mirrorText: string;
	revisedText: string | null;
};

const FIXTURE_DEFAULTS: FixtureState = {
	answer: "usual",
	atCap: false,
	audio: { playing: false, ready: true },
	canSayMore: true,
	care: "main",
	companionName: null,
	error: null,
	flash: { line: -1, n: 0 },
	heavy: false,
	landN: 0,
	late: false,
	liftN: 0,
	listening: false,
	mirrorText: MIRROR_TEXT,
	mv: 1,
	nextPick: null,
	nq: false,
	nqReason: null,
	nqText: "",
	nudge: false,
	pickMode: false,
	picks: [],
	prompt: COPY.write.prompt.evening,
	reach: "reachable",
	ready: true,
	revisedText: null,
	rewriting: false,
	sayMore: false,
	sayMoreHelps: false,
	sel: -1,
	sent: "",
	sentPicks: [],
	set: "flat",
	sheetOpen: false,
	slow: false,
	spaceNameOpen: false,
	stage: "write",
	streak: STREAK,
	take: { note: null, remainingMs: null, scribe: false, writing: false },
	takeN: 0,
	text: "",
	turns: 0,
	upsellOpen: false,
	waitStage: 0,
	whatHappened: false,
};

const S_MS = 1000;
const REWRITE_MS = 1100;

export function useFixtureReflect(initial: Partial<FixtureState>): Reflect {
	const [f, setF] = useState<FixtureState>({ ...FIXTURE_DEFAULTS, ...initial });
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const patch = (p: Partial<FixtureState>) => setF((s) => ({ ...s, ...p }));
	const after = (ms: number, p: () => Partial<FixtureState>) => {
		timers.current.push(setTimeout(() => setF((s) => ({ ...s, ...p() })), ms));
	};
	const clear = () => {
		for (const t of timers.current) {
			clearTimeout(t);
		}
		timers.current = [];
	};
	useEffect(() => clear, []);

	const runWait = (answer: Answer) => {
		if (answer === "offline") {
			return;
		}
		const t = TIMES[answer];
		if (t.s1 >= 0) {
			after(t.s1 * S_MS, () => ({ waitStage: 1 }));
		}
		after(t.s2 * S_MS, () => ({ waitStage: 2 }));
		if (t.slow) {
			after(t.slow * S_MS, () => ({ slow: true }));
		}
		after(t.land * S_MS, () => ({ slow: false, stage: "land" }));
		after(t.land * S_MS + LAND_MS, () => ({
			landN: f.landN + 1,
			stage: "mirror",
		}));
	};

	const lines = mirrorSentences(f.mirrorText);
	const revised = f.revisedText ? mirrorSentences(f.revisedText) : null;
	const shown = f.mv === 2 && revised ? revised : lines;
	const words = pairPhrases(f.sent, shown).words;
	const { answer, sent, mirrorText, revisedText, ...state } = f;

	const refine = () => {
		patch({ nq: false, rewriting: true, sayMore: false, sel: -1 });
		after(REWRITE_MS, () => ({
			atCap: f.turns + 1 >= REFINEMENT_MAX_TURNS,
			landN: f.landN + 1,
			mv: 2,
			nqReason: null,
			nqText: "",
			revisedText: REVISED_TEXT,
			rewriting: false,
			turns: f.turns + 1,
		}));
	};

	return {
		actions: {
			answerWhatHappened: () => patch({ whatHappened: false }),
			cancelSpeaking: () => {
				patch({ listening: false });
				toast(COPY.write.cancelled);
			},
			choosePath: (path) => patch({ nextPick: path }),
			close: () => undefined,
			closeNotQuite: () =>
				patch({ nq: false, pickMode: false, sayMore: false, sel: -1 }),
			dismissSpaceName: () => patch({ spaceNameOpen: false }),
			dismissUpsell: () => patch({ listening: true, upsellOpen: false }),
			finish: () => undefined,
			goPath: (path) =>
				path === "exit" ? patch({ stage: "heard" }) : undefined,
			leaveIt: () =>
				patch({ nextPick: null, stage: "next", whatHappened: true }),
			notNow: () => patch({ nextPick: null, stage: "next" }),
			notQuite: (line) => {
				if (line === undefined) {
					patch({ pickMode: true });
					toast(COPY.mirror.tapLine);
					return;
				}
				patch({
					nq: true,
					nqReason: null,
					nqText: "",
					pickMode: false,
					sel: line,
				});
			},
			openHelp: () => undefined,
			openResource: () => undefined,
			patch: (p: Partial<ReflectUi>) => patch(p),
			pickReason: (reason) => patch({ nqReason: reason }),
			resourcesSeen: () => patch({ nextPick: null, stage: "next" }),
			retry: () => {
				patch({ error: null, slow: false, waitStage: 0 });
				runWait("usual");
			},
			saveSpaceName: () => {
				patch({ spaceNameOpen: false });
				return Promise.resolve(null);
			},
			sayMore: () => patch({ nq: false, sayMore: true }),
			seePlus: () => undefined,
			send: () => {
				if (!(f.text.trim() || f.picks.length > 0)) {
					return false;
				}
				clear();
				const heavy = f.answer === "heavy";
				patch({
					error: null,
					heavy,
					liftN: f.liftN + 1,
					mirrorText: heavy ? HEAVY_MIRROR_TEXT : MIRROR_TEXT,
					mv: 1,
					reach: f.answer === "offline" ? "offline" : "reachable",
					revisedText: null,
					sent: f.text.trim(),
					sentPicks: f.picks,
					slow: false,
					stage: "wait",
					text: "",
					turns: 0,
					waitStage: 0,
				});
				runWait(f.answer);
				return true;
			},
			setNqText: (text) => patch({ nqText: text }),
			setSet: (set) => patch({ set }),
			setText: (text) => patch({ nudge: false, text }),
			setVersion: (mv) => patch({ mv }),
			showResources: () => patch({ care: "res" }),
			startOver: () => {
				clear();
				setF({ ...FIXTURE_DEFAULTS });
			},
			startSpeaking: () => patch({ listening: true }),
			stepAway: () => toast(COPY.wait.keepsGoing),
			stopSpeaking: () =>
				setF((s) => ({
					...s,
					listening: false,
					takeN: s.takeN + 1,
					text: s.text ? `${s.text} ${SPOKEN}` : SPOKEN,
				})),
			submitNotQuite: refine,
			tapLine: (line) => patch({ flash: { line, n: f.flash.n + 1 } }),
			thatsIt: () => patch({ nextPick: null, stage: "next" }),
			toggleAudio: () =>
				patch({ audio: { ...f.audio, playing: !f.audio.playing } }),
			togglePick: (word) => {
				if (f.picks.includes(word)) {
					patch({ picks: f.picks.filter((w) => w !== word) });
				} else if (f.picks.length < MAX_TEXTURES) {
					patch({ picks: [...f.picks, word] });
				} else {
					toast(COPY.write.fourIsPlenty);
				}
			},
			upgradeDictation: () => patch({ upsellOpen: false }),
		},
		state: {
			...state,
			mirror: {
				first: pairPhrases(sent, lines).mirror,
				revised: revised ? pairPhrases(sent, revised).mirror : null,
			},
			resources: resourceRows(RESOURCES),
			yourWords: words,
		},
	};
}
