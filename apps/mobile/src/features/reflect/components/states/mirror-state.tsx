import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import type { ClaimStrength } from "@xolace/backend/convex/ai/routing";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import {
	Chip,
	PressableFeedback,
	ScrollShadow,
	useThemeColor,
} from "heroui-native";
import { useEffect, useRef } from "react";
import type { TextInstance } from "react-native";
import { AccessibilityInfo, ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import { ToneTipBanner } from "@/src/features/reflect/components/tone-tip-banner";
import { useMirrorAudio } from "@/src/features/reflect/hooks/use-mirror-audio";
import type { EntryType } from "@/src/features/reflect/types";
import type { MirrorTone } from "@/src/features/settings/components/mirror-tone-picker-dialog";
import { TalkTimeLeft } from "@/src/features/talk/talk-time-left";
import { TalkWith } from "@/src/features/talk/talk-with";
import { useTalkSayMore } from "@/src/features/talk/use-talk-say-more";
import { playMirrorArrival } from "@/src/lib/haptics";
import { MirrorActionRow } from "./mirror-action-row";
import { MirrorToneBadge } from "./mirror-tone-badge";

type Props = {
	mirror: string;
	selectedTextures: string[];
	entryType: EntryType;
	sessionId: Id<"sessions"> | null;
	toneUsed: MirrorTone | null;
	/** Derived server-side; "reaching"/"holding" means this mirror named a gap. */
	claimStrength: ClaimStrength | null;
	/** Refinement turns are exhausted — the row collapses to "That's it". */
	atCap: boolean;
	onThatsIt: () => void;
	onNotQuite: () => void;
	onSayMore: () => void;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_FADE = { opacity: 0 };
const EASE_ANIMATE_FADE = { opacity: 1 };
const EASE_TEXTURE_TRANSITION = {
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_LABEL_TRANSITION = {
	duration: 600,
	easing: EASING,
	type: "timing" as const,
};
const AUDIO_ANIMATION = {
	scale: { ignoreScaleCoefficient: true, value: 0.85 },
};
const SPEAKER_PLAYING = {
	android: "volume_up",
	ios: "speaker.wave.2.fill",
	web: "volume_up",
} as const;
const SPEAKER_MUTED = {
	android: "volume_off",
	ios: "speaker.fill",
	web: "volume_off",
} as const;
const A11Y_SELECTED = { selected: true };
const A11Y_UNSELECTED = { selected: false };

export const MirrorState = ({
	mirror,
	selectedTextures,
	entryType,
	sessionId,
	toneUsed,
	claimStrength,
	atCap,
	onThatsIt,
	onNotQuite,
	onSayMore,
}: Props) => {
	const { isReady, isPlaying, toggle } = useMirrorAudio(sessionId);
	const talkSayMore = useTalkSayMore(sessionId);
	const accent = useThemeColor("accent");
	const mirrorRef = useRef<TextInstance>(null);

	// No audio cleanup here: useAudioPlayer releases the native player on unmount,
	// which stops playback. Pausing it ourselves races that release and crashes
	// (see ba00535 "fix timeline crash").
	useEffect(() => {
		playMirrorArrival();
		// Move the screen reader onto the mirror so it reads it aloud. Delayed so the
		// processing → mirror swap settles first, or iOS drops the focus move.
		const t = setTimeout(() => {
			if (mirrorRef.current) {
				AccessibilityInfo.sendAccessibilityEvent(mirrorRef.current, "focus");
			}
		}, 500);
		return () => clearTimeout(t);
	}, []);

	const showTextures =
		selectedTextures.length > 0 &&
		(entryType === "scaffold" || entryType === "hybrid");

	const speakerName = isPlaying ? SPEAKER_PLAYING : SPEAKER_MUTED;

	return (
		<View className="flex-1 px-6">
			{/* In the flow, not floating: a floating banner covered the label, the
          tone badge and the top of a long mirror. */}
			<ToneTipBanner />

			<View className="flex-1 justify-center">
				{/* Texture pills from scaffold */}
				{showTextures && (
					<EaseView
						animate={EASE_ANIMATE_FADE}
						className="mb-5 flex-row flex-wrap gap-1.5"
						initialAnimate={EASE_INITIAL_FADE}
						transition={EASE_TEXTURE_TRANSITION}
					>
						{selectedTextures.map((word) => (
							<Chip
								animation="disable-all"
								color="accent"
								key={word}
								size="sm"
								variant="primary"
							>
								<Chip.Label>{word}</Chip.Label>
							</Chip>
						))}
					</EaseView>
				)}

				<EaseView
					animate={EASE_ANIMATE_FADE}
					className="mb-3 flex-row items-center gap-3"
					initialAnimate={EASE_INITIAL_FADE}
					transition={EASE_LABEL_TRANSITION}
				>
					<AppText className="text-accent text-xs uppercase tracking-widest">
						The Mirror
					</AppText>
					{isReady && (
						<PressableFeedback
							accessibilityHint="Toggles playback of the mirror response"
							accessibilityLabel={
								isPlaying ? "Pause mirror audio" : "Play mirror audio"
							}
							accessibilityRole="button"
							accessibilityState={isPlaying ? A11Y_SELECTED : A11Y_UNSELECTED}
							animation={AUDIO_ANIMATION}
							hitSlop={8}
							onPress={() => {
								toggle();
							}}
						>
							<SymbolView name={speakerName} size={16} tintColor={accent} />
						</PressableFeedback>
					)}
				</EaseView>

				<TalkWith sessionId={sessionId} />
				<MirrorToneBadge toneUsed={toneUsed} />

				{/* The fade says "more below": a long mirror cut at a line break looks
          finished. Height cap lives on the wrapper — a % maxHeight on the
          ScrollView would resolve against the wrapper's undefined height.
          flexShrink lets it give up height when the cap plus the rows around
          it don't fit; RN defaults to 0, so a centered column overflowed both
          edges instead of scrolling. */}
				<ScrollShadow
					LinearGradientComponent={LinearGradient}
					size={32}
					style={styles.mirrorScroll}
				>
					<ScrollView
						className="border-accent/40 border-l-2 pl-4"
						showsVerticalScrollIndicator={false}
					>
						<AppText
							className="text-foreground text-xl italic leading-8"
							ref={mirrorRef}
							selectable
						>
							{removeEmDash(mirror)}
						</AppText>
					</ScrollView>
				</ScrollShadow>

				<MirrorActionRow
					atCap={atCap}
					claimStrength={claimStrength}
					onNotQuite={onNotQuite}
					onSayMore={talkSayMore?.open ?? onSayMore}
					onThatsIt={onThatsIt}
					sayMore={talkSayMore?.offered ?? true}
				/>
				<TalkTimeLeft sessionId={sessionId} />
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	mirrorScroll: { flexGrow: 0, flexShrink: 1, maxHeight: "60%" },
});
