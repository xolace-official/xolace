import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { toast } from "@/components/shared/toast";
import { useSessionMode } from "@/context/session-mode-context";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";
import { useAppStore } from "@/store/store";
import { COPY } from "./copy";
import { useMirrorAudio } from "./mirror/use-mirror-audio";
import { useTalkSayMore } from "./mirror/use-talk-say-more";
import { NUDGE } from "./motion";
import type { Reflect, ReflectUi } from "./reflect-data";
import {
	holdsArrivals,
	MAX_CHARS,
	MAX_TURNS,
	mirrorSentences,
	pairPhrases,
	promptFor,
	resourceRows,
	stageOf,
	waitError,
	waitStageOf,
} from "./reflect-model";
import { reportFailure } from "./session/report-failure";
import { useLanding } from "./session/use-landing";
import { useMirrorVersions } from "./session/use-mirror-versions";
import { useOffline } from "./session/use-offline";
import { useReflectBridge } from "./session/use-reflect-bridge";
import { useReflectionMachine } from "./session/use-reflection-machine";
import { useTypingPause } from "./session/use-typing-pause";
import { useWaitClock } from "./session/use-wait-clock";
import { useWhereNext } from "./session/use-where-next";
import { MAX_TEXTURES } from "./texture-sets";
import { useDictationTakes } from "./write/dictation/use-dictation-takes";

const FRESH_UI: ReflectUi = {
	care: "main",
	nextPick: null,
	nq: false,
	pickMode: false,
	sayMore: false,
	sel: -1,
};

/**
 * Reflect on production's session machine (`session/use-reflection-machine.ts`): Convex, the AI
 * round trip, escalation, refinements, the draft, dictation and the analytics stay there. This
 * maps it onto the screen's stages, and keeps the screen state the stages share.
 */
export function useReflectData(): Reflect {
	const m = useReflectionMachine();
	const { state: s, dispatch } = m;
	const { isNight: late } = useSessionMode();
	const offline = useOffline();
	const set = useAppStore((st) => st.textureSetId);
	const setTextureSet = useAppStore((st) => st.setTextureSetId);
	const posthog = usePostHog();
	const replySeed = useAppStore((st) => st.replySeed);
	const pending = useAppStore((st) => st.pendingEventPrompt);
	// The route's starter bubble raises it while it's up over Write.
	const sheetOpen = useAppStore((st) => st.homeSheetOpen);
	const submitMiss = useMutation(api.feedback.submit);
	const audio = useMirrorAudio(m.sessionId);
	const talk = useTalkSayMore(m.sessionId);
	const versions = useMirrorVersions(m.sessionId, m.mirrorText, m.turnsCount);

	const [ui, setUi] = useState<ReflectUi>(FRESH_UI);
	const [flash, setFlash] = useState({ line: -1, n: 0 });
	const [liftN, setLiftN] = useState(0);
	const [missTurn, setMissTurn] = useState(-1);

	const next = useWhereNext(m);
	const refining = s.screen === "processing" && s.lastFeedbackType !== null;
	const stage = useLanding(
		stageOf(s.screen, { heard: next.heard !== null, refining })
	);
	const { isPlus } = usePlusEntitlement();
	const openPaywall = usePaywall((p) => p.open);
	const error = s.screen === "error" ? waitError(s.errorMessage, isPlus) : null;
	const slow = useWaitClock(stage === "wait" && !error);

	const [shown, setShown] = useState(stage);
	if (stage !== shown) {
		setShown(stage);
		if (stage === "write") {
			setUi(FRESH_UI);
		}
	}

	// Production's pause before the nudge: longer at night (compose-screen's NIGHT_NUDGE_DELAY_MS).
	const typingPause = useTypingPause(
		() => dispatch({ type: "PAUSE_TIMEOUT" }),
		late ? NUDGE.nightMs : NUDGE.dayMs
	);
	const takes = useDictationTakes(m, s.entryText);
	const plus = m.plusDictation;

	useReflectBridge(
		s.screen,
		holdsArrivals(stage),
		s.entryText.trim().length > 0,
		m.isLoading,
		dispatch
	);

	const scaffold = s.entryType === "scaffold";
	const sent = m.rawInput || s.entryText;
	const first = mirrorSentences(versions.firstText);
	const revised = versions.revisedText
		? mirrorSentences(versions.revisedText)
		: null;
	const shownLines = versions.mv === 2 && revised ? revised : first;
	const paired = pairPhrases(scaffold ? "" : sent, shownLines);
	const eventPrompt =
		pending && pending.expiresAt > Date.now() ? pending.text : undefined;
	const nq = s.screen === "clarify" && s.lastFeedbackType === "not_quite";
	const sayMore = s.screen === "clarify" && s.lastFeedbackType === "say_more";

	return {
		actions: {
			cancelSpeaking: takes.cancel,
			choosePath: (path) => setUi((u) => ({ ...u, nextPick: path })),
			close: next.close,
			closeNotQuite: () => {
				dispatch({ type: "BACK_TO_MIRROR" });
				setUi((u) => ({ ...u, pickMode: false, sel: -1 }));
			},
			dismissSpaceName: next.dismissSpaceName,
			dismissUpsell: m.dictationUpsell.onNotNow,
			finish: next.finish,
			goPath: next.goPath,
			leaveIt: () => void m.handleGaveUpPathSelection(),
			notNow: () => void m.handleEscalationDismiss(),
			notQuite: (line) => {
				if (line === undefined) {
					setUi((u) => ({ ...u, pickMode: true }));
					toast(COPY.mirror.tapLine);
					return;
				}
				setUi((u) => ({ ...u, pickMode: false, sel: line }));
				m.handleNotQuite();
			},
			openHelp: next.openHelp,
			openResource: next.openResource,
			patch: (p) => setUi((u) => ({ ...u, ...p })),
			pickReason: (reason) => {
				dispatch({ reason, type: "MISS_REASON" });
				// One miss per turn, as production's sheet recorded it.
				if (!m.sessionId || missTurn === m.turnsCount) {
					return;
				}
				setMissTurn(m.turnsCount);
				submitMiss({
					selectedOption: reason,
					sessionId: m.sessionId,
					turnIndex: m.turnsCount,
					type: "mirror_miss",
				}).catch(reportFailure);
			},
			resourcesSeen: () => void m.handleEscalationContinue(),
			retry: () => void m.handleRetry(),
			saveSpaceName: next.saveSpaceName,
			sayMore: () => (talk ? talk.open() : m.handleSayMore()),
			seePlus: () => openPaywall("rate_limit"),
			send: () => {
				const words = s.entryText.trim();
				// A Plus take still being heard or written down would be lost to a send.
				const taking = plus !== null && plus.phase !== "idle";
				if (taking || !(words || s.selectedTextures.length > 0)) {
					return false;
				}
				typingPause.clearTimer();
				setLiftN((n) => n + 1);
				void (words ? m.submitReflection() : m.submitScaffold());
				return true;
			},
			setNqText: (text) => dispatch({ text, type: "CLARIFY_TEXT_CHANGE" }),
			setSet: (to) => {
				if (to === set) {
					return;
				}
				setTextureSet(to);
				playSoftPress();
				posthog.capture("texture_set_changed", { from: set, to });
			},
			setText: (text) => {
				dispatch({ text: text.slice(0, MAX_CHARS), type: "TEXT_CHANGE" });
				typingPause.resetTimer();
			},
			setVersion: versions.setVersion,
			showResources: () => {
				setUi((u) => ({ ...u, care: "res" }));
				void m.handleEscalationEngage();
			},
			startOver: () => void m.handleReset(),
			startSpeaking: takes.start,
			stepAway: next.stepAway,
			stopSpeaking: takes.stop,
			submitNotQuite: () => {
				if (!s.clarifyText.trim()) {
					return;
				}
				setUi((u) => ({ ...u, sel: -1 }));
				void m.submitClarification();
			},
			tapLine: (line) => setFlash((f) => ({ line, n: f.n + 1 })),
			thatsIt: () => void m.handleThatsIt(),
			toggleAudio: audio.toggle,
			togglePick: (word) => {
				const picked = s.selectedTextures.includes(word);
				if (!picked && s.selectedTextures.length >= MAX_TEXTURES) {
					toast(COPY.write.fourIsPlenty);
					return;
				}
				dispatch({ type: "TOGGLE_TEXTURE", word });
			},
			upgradeDictation: m.dictationUpsell.onUpgrade,
		},
		state: {
			atCap: m.turnsCount >= MAX_TURNS || s.screen === "gave-up",
			audio: { playing: audio.isPlaying, ready: audio.isReady },
			canSayMore: talk ? talk.offered : true,
			care: ui.care,
			companionName: m.companionName,
			error,
			flash,
			heavy: s.screen === "escalation",
			landN: versions.landN,
			late,
			liftN,
			listening: m.isRecording,
			mirror: {
				first: pairPhrases(scaffold ? "" : sent, first).mirror,
				revised: revised
					? pairPhrases(scaffold ? "" : sent, revised).mirror
					: null,
			},
			mv: versions.mv,
			nextPick: ui.nextPick,
			nq,
			nqReason: s.missReason,
			nqText: s.clarifyText,
			nudge: s.screen === "typing-nudge",
			offline,
			pickMode: ui.pickMode,
			picks: s.selectedTextures,
			prompt: promptFor({ eventPrompt, late, replySeed }),
			ready: !m.isLoading,
			resources: resourceRows(m.escalationResources),
			rewriting: refining,
			sayMore,
			sayMoreHelps:
				m.claimStrength === "reaching" || m.claimStrength === "holding",
			sel: ui.sel,
			sentPicks: s.selectedTextures,
			set,
			sheetOpen,
			slow,
			spaceNameOpen: next.spaceNameOpen,
			stage,
			streak: next.streak,
			take: {
				note: plus?.phase === "idle" ? plus.note : null,
				remainingMs: plus?.phase === "listening" ? plus.remainingMs : null,
				writing: plus?.phase === "writing",
			},
			takeN: takes.takeN,
			text: s.entryText,
			turns: m.turnsCount,
			upsellOpen: m.dictationUpsell.isOpen,
			waitStage: waitStageOf(m.processingStage),
			yourWords: paired.words,
		},
	};
}
