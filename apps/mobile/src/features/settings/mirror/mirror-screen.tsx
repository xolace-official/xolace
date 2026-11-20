import { useRef, useState } from "react";
import { ScrollView, type ScrollViewInstance, View } from "react-native";
import { Footnote, SectionTitle } from "@/components/settings-kit/parts";
import { AppText } from "@/components/shared/app-text";
import { MirrorCard } from "@/features/settings/mirror/card/mirror-card";
import { MIRROR_COPY as C } from "@/features/settings/mirror/copy";
import { useMirror } from "@/features/settings/mirror/mirror-data";
import {
	type MirrorTone,
	orbTap,
	talkTap,
	toneTap,
	type VoiceSlug,
} from "@/features/settings/mirror/mirror-model";
import { TalkCard } from "@/features/settings/mirror/talk/talk-card";
import { ToneGate } from "@/features/settings/mirror/tones/tone-gate";
import { TonePills } from "@/features/settings/mirror/tones/tone-pills";
import { VoiceOrbs } from "@/features/settings/mirror/voice/voice-orbs";
import type { VoiceValue } from "@/lib/talk/voice-options";

const INSET = 20;
const TITLE_GAP = 12;

type Section = "mirror" | "talk";

export type MirrorOpens = {
	peek?: MirrorTone;
	focus?: VoiceValue;
	scrollToTalk?: boolean;
};

export function MirrorScreen({ opens = {} }: { opens?: MirrorOpens }) {
	const { state, actions } = useMirror();
	const [peek, setPeek] = useState<MirrorTone | null>(opens.peek ?? null);
	const [focus, setFocus] = useState<VoiceValue | null>(opens.focus ?? null);
	const [section, setSection] = useState<Section>("mirror");
	const scrolled = useRef(!opens.scrollToTalk);
	const scroll = useRef<ScrollViewInstance>(null);

	const shown = peek ?? state.tone;
	const playingHere = (s: Section) => (section === s ? state.playing : null);
	const preview = (p: { play: VoiceSlug } | "stop", from: Section) => {
		if (p === "stop") {
			actions.stop();
			return;
		}
		setSection(from);
		actions.play(p.play);
	};

	const onTone = (tone: MirrorTone) => {
		const tap = toneTap(tone, state.saved.tone, state.plus);
		if (tap === "peek") {
			setPeek(tone);
			actions.reachForTone();
			return;
		}
		if (tap === "choose" || tap === "none") {
			setPeek(null);
		}
		if (tap === "choose") {
			actions.setTone(tone);
		}
	};
	const onOrb = (id: VoiceValue) => {
		const tap = orbTap(id, {
			playing: playingHere("mirror"),
			plus: state.plus,
			saved: state.saved,
			voice: state.voice,
		});
		setFocus(tap.focus);
		if (tap.choose) {
			actions.setVoice(tap.choose);
		}
		preview(tap.preview, "mirror");
	};
	const spoken = state.voice === "auto" ? null : state.voice;

	return (
		<ScrollView
			className="bg-background"
			contentContainerClassName="pb-10"
			contentInsetAdjustmentBehavior="automatic"
			onContentSizeChange={() => {
				if (!scrolled.current) {
					scrolled.current = true;
					scroll.current?.scrollToEnd({ animated: false });
				}
			}}
			ref={scroll}
		>
			<AppText
				className="px-5 pb-4.5 text-[15px] text-foreground/55 leading-[21px]"
				variant="body"
			>
				{C.sub}
			</AppText>
			<MirrorCard
				onHear={() => spoken && onOrb(spoken)}
				playing={spoken !== null && playingHere("mirror") === spoken}
				shown={shown}
				voice={spoken}
			/>
			<TonePills
				chosen={state.tone}
				onPick={onTone}
				plus={state.plus}
				shown={shown}
			/>
			{state.plus === "free" && shown === "witnessed" ? (
				<ToneGate onSeePlus={() => actions.openPlus("mirror_tone")} />
			) : null}
			<View className="mt-7.5">
				<SectionTitle aside={C.voiceAside} inset={INSET} pb={TITLE_GAP}>
					{C.voice}
				</SectionTitle>
				<VoiceOrbs
					focus={focus ?? state.voice}
					onSeePlus={() => actions.openPlus("mirror_voice")}
					onTap={onOrb}
					playing={playingHere("mirror")}
					plus={state.plus}
					tone={state.tone}
					voice={state.voice}
				/>
			</View>
			{state.talk ? (
				<View className="mt-7.5">
					<SectionTitle inset={INSET} pb={TITLE_GAP}>
						{C.talk(state.companion)}
					</SectionTitle>
					<TalkCard
						onDirectness={actions.setDirectness}
						onPace={actions.setPace}
						onVoice={(id) => {
							const tap = talkTap(id, {
								playing: playingHere("talk"),
								voice: state.talk?.voice ?? id,
							});
							if (tap.choose) {
								actions.setTalkVoice(id);
							}
							preview(tap.preview, "talk");
						}}
						playing={playingHere("talk")}
						style={state.talk}
					/>
					<Footnote>{C.talkNote(state.companion)}</Footnote>
				</View>
			) : null}
		</ScrollView>
	);
}
