/** The talk screen's fixture adapter: the real `TalkScreen` under a provider filled from a
 * scripted talk. Nothing reaches Convex, ElevenLabs or the microphone's audio; the first
 * talk's mic ask is the system's own alert, and the voice samples are the bundled clips. */
import type {
	TalkLook,
	TalkPace,
	TalkView,
	VoiceSlug,
} from "@xolace/backend/convex/lib/voices";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import type { Directness } from "@/lib/talk/use-talk-style";
import { useVoicePreview } from "@/lib/talk/use-voice-preview";
import {
	type TalkHelp,
	type TalkScreen,
	TalkScreenProvider,
} from "../talk-data";
import { phaseOf } from "../talk-model";
import { TalkScreen as Screen } from "../talk-screen";
import { CLOCK_FROM_S, FIXTURE_NAME, WEEK } from "./fixtures";
import { type Seed, useScriptedTalk } from "./use-scripted-talk";

/** A step a state plays once it has opened, as the prototype's jumps did. */
type Step = "sample" | "begin" | "leave";
const STEP_AT_MS = 600;

export type FixtureTalkProps = {
	seed?: Seed;
	look?: TalkLook;
	voice?: VoiceSlug;
	view?: TalkView;
	pace?: TalkPace;
	directness?: Directness;
	week?: number;
	micAsk?: boolean;
	help?: TalkHelp;
	error?: string;
	step?: Step;
};

export function FixtureTalk(p: FixtureTalkProps) {
	const week = p.week ?? WEEK.full;
	const talk = useScriptedTalk(p.seed, week);
	const preview = useVoicePreview();
	const [look, setLook] = useState<TalkLook>(p.look ?? "xolace");
	const [voice, setVoice] = useState<VoiceSlug>(p.voice ?? "vesper");
	const [view, setView] = useState<TalkView>(p.view ?? "companion");
	const [micAsk, setMicAsk] = useState(p.micAsk ?? false);

	const begin = async () => {
		preview.stop();
		if (micAsk) {
			const { granted } = await requestRecordingPermissionsAsync();
			setMicAsk(false);
			if (!granted) {
				return;
			}
		}
		talk.begin();
	};
	const value: TalkScreen = {
		actions: {
			begin: () => void begin(),
			end: talk.end,
			justEnd: talk.end,
			openHelp: () => undefined,
			openKept: () => router.push("/dev/talk/whats-kept"),
			openResource: () => undefined,
			openStyle: () => router.push("/dev/talk/how-ember-talks"),
			pickVoice(next) {
				setVoice(next);
				preview.toggle(next);
			},
			send: talk.send,
			setLook,
			setView,
			stopSample: preview.stop,
			toggleMic: talk.toggleMic,
		},
		state: {
			clockFromS: CLOCK_FROM_S,
			directness: p.directness ?? "balanced",
			endsAt: talk.endsAt,
			error: p.error ?? null,
			help: p.help ?? null,
			live: talk.live,
			look,
			micAsk,
			micLevel: talk.level,
			muted: talk.muted,
			name: FIXTURE_NAME,
			pace: p.pace ?? "normal",
			phase: phaseOf(talk.status, false),
			presence: talk.status.presence,
			reopened: false,
			sample: preview.playingSlug,
			turns: talk.turns,
			view,
			voice,
			week,
		},
	};

	useEffect(() => {
		const steps: Record<Step, () => void> = {
			begin: value.actions.begin,
			leave: () => router.back(),
			sample: () => value.actions.pickVoice(voice),
		};
		const step = p.step ? steps[p.step] : undefined;
		if (!step) {
			return;
		}
		const id = setTimeout(step, STEP_AT_MS);
		return () => clearTimeout(id);
	}, []);

	return (
		<TalkScreenProvider value={value}>
			<Screen />
		</TalkScreenProvider>
	);
}
