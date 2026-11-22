import type {
	TalkLook,
	TalkPace,
	TalkView,
	VoiceSlug,
} from "@xolace/backend/convex/lib/voices";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { router } from "expo-router";
import { useEffect, useEffectEvent, useState } from "react";
import { playAffirmativePress } from "@/lib/haptics";
import { createSingleFlight } from "@/lib/single-flight";
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
	locked?: boolean;
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

	const [gate] = useState(createSingleFlight);
	const [starting, setStarting] = useState(false);

	const begin = () =>
		gate.run(async () => {
			preview.stop();
			if (talk.status.started) {
				return;
			}
			setStarting(true);
			playAffirmativePress();
			try {
				if (micAsk) {
					const { granted } = await requestRecordingPermissionsAsync();
					setMicAsk(false);
					if (!granted) {
						return;
					}
				}
				talk.begin();
			} finally {
				setStarting(false);
			}
		});
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
			unlock: () => undefined,
		},
		state: {
			clockFromS: CLOCK_FROM_S,
			directness: p.directness ?? "balanced",
			endsAt: talk.endsAt,
			error: p.error ?? null,
			help: p.help ?? null,
			live: talk.live,
			locked: p.locked ?? false,
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
			starting,
			turns: talk.turns,
			view,
			voice,
			week,
		},
	};

	const playStep = useEffectEvent(() => {
		const steps: Record<Step, () => void> = {
			begin: value.actions.begin,
			leave: () => router.back(),
			sample: () => value.actions.pickVoice(voice),
		};
		if (p.step) {
			steps[p.step]();
		}
	});
	useEffect(() => {
		const id = setTimeout(playStep, STEP_AT_MS);
		return () => clearTimeout(id);
	}, []);

	return (
		<TalkScreenProvider value={value}>
			<Screen />
		</TalkScreenProvider>
	);
}
