import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useIsPreview, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Card, PressableFeedback, useThemeColor } from "heroui-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/shared/app-text";
import { MorphLoader } from "@/src/components/shared/loader/morph/morph-loader";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import { useMirrorAudio } from "@/src/features/reflect/hooks/use-mirror-audio";
import { TalkTranscript } from "@/src/features/talk/talk-thread";
import {
	getEmotionEmoji,
	getEmotionLabel,
	getPathLabel,
} from "@/src/features/timeline/emotions";

const formatDate = (timestamp: number) => {
	const date = new Date(timestamp);
	return {
		day: new Intl.DateTimeFormat("en-US", {
			day: "numeric",
			month: "short",
			weekday: "long",
		}).format(date),
		time: new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			hour12: true,
			minute: "2-digit",
		}).format(date),
	};
};

const BACK_ICON = {
	android: "arrow_back",
	ios: "chevron.left",
	web: "arrow_back",
} as const;
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
const AUDIO_ANIMATION = {
	scale: { ignoreScaleCoefficient: true, value: 0.85 },
};
const A11Y_SELECTED = { selected: true };
const A11Y_UNSELECTED = { selected: false };

const TONE_BADGE: Partial<Record<string, { text: string; border: string }>> = {
	direct: { border: "border-tone-direct/40", text: "text-tone-direct" },
	gentle: { border: "border-tone-gentle/40", text: "text-tone-gentle" },
	poetic: { border: "border-tone-poetic/40", text: "text-tone-poetic" },
	witnessed: {
		border: "border-tone-witnessed/40",
		text: "text-tone-witnessed",
	},
};

const SectionLabel = ({ children }: { children: string }) => (
	<AppText className="mb-3 text-foreground/35 text-xs uppercase tracking-widest">
		{children}
	</AppText>
);

export const SessionDetailsScreen = () => {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const tintColor = useThemeColor("foreground") as string;

	const sessionId = id ? (id as Id<"sessions">) : null;

	const details = useQuery(
		api.sessions.getSessionDetails,
		sessionId ? { sessionId } : "skip"
	);
	const { isReady, isPlaying, toggle } = useMirrorAudio(sessionId);

	// A long-press preview is a card, not a screen: no back button, no notch inset.
	const isPreview = useIsPreview();
	const topInsetStyle = { paddingTop: isPreview ? 0 : insets.top };

	if (!id) {
		return (
			<View
				className="flex-1 items-center justify-center bg-background"
				style={topInsetStyle}
			>
				<AppText className="text-foreground/40">
					No session ID provided.
				</AppText>
			</View>
		);
	}

	if (details === undefined) {
		return (
			<View
				className="flex-1 items-center justify-center bg-background"
				style={topInsetStyle}
			>
				<MorphLoader />
			</View>
		);
	}

	if (!details) {
		return (
			<View
				className="flex-1 items-center justify-center bg-background"
				style={topInsetStyle}
			>
				<AppText className="text-foreground/40">Session not found.</AppText>
			</View>
		);
	}

	const { day, time } = formatDate(details.createdAt);
	const emotion = details.granularLabel ?? details.primaryEmotion ?? null;
	const emoji = getEmotionEmoji(emotion);
	const emotionLabel = getEmotionLabel(emotion);
	const pathLabel = getPathLabel(details.pathChosen ?? null);
	const toneLabel = details.toneUsed
		? details.toneUsed.charAt(0).toUpperCase() + details.toneUsed.slice(1)
		: null;
	const toneBadge = details.toneUsed
		? (TONE_BADGE[details.toneUsed] ?? {
				border: "border-foreground/20",
				text: "text-foreground/40",
			})
		: null;
	const speakerName = isPlaying ? SPEAKER_PLAYING : SPEAKER_MUTED;

	return (
		<View className="flex-1 bg-background" style={topInsetStyle}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Back button */}
				{!isPreview && (
					<View className="px-6 pt-3 pb-1">
						<Pressable
							accessibilityLabel="Go back"
							accessibilityRole="button"
							className="self-start"
							hitSlop={12}
							onPress={() => router.back()}
						>
							<SymbolView name={BACK_ICON} size={20} tintColor={tintColor} />
						</Pressable>
					</View>
				)}

				{/* Date + time */}
				<View className="px-6 pt-5 pb-8">
					<AppText className="font-medium text-base text-foreground/55">
						{day}
					</AppText>
					<AppText className="mt-0.5 font-medium text-base text-foreground/55">
						{time}
					</AppText>
				</View>

				<View className="px-6">
					{/* User input: a talk's is its thread, under the mirror */}
					{details.rawInput && details.entryType !== "talk" && (
						<>
							<SectionLabel>You said</SectionLabel>
							<Card
								className="mb-8 rounded-2xl border border-foreground/10"
								style={styles.continuousBorder}
								variant="tertiary"
							>
								<Card.Body className="px-5 py-4">
									<AppText
										className="font-light text-foreground/55 text-sm leading-6"
										selectable
									>
										&ldquo;{details.rawInput}&rdquo;
									</AppText>
								</Card.Body>
							</Card>
						</>
					)}

					{/* Mirror */}
					{details.mirrorText && (
						<>
							<View className="mb-3 flex-row items-center gap-3">
								<SectionLabel>The mirror</SectionLabel>
								{isReady ? (
									<PressableFeedback
										accessibilityHint="Toggles playback of the mirror response"
										accessibilityLabel={
											isPlaying ? "Pause mirror audio" : "Play mirror audio"
										}
										accessibilityRole="button"
										accessibilityState={
											isPlaying ? A11Y_SELECTED : A11Y_UNSELECTED
										}
										animation={AUDIO_ANIMATION}
										className="-mt-3"
										hitSlop={8}
										onPress={toggle}
									>
										<SymbolView
											name={speakerName}
											size={16}
											tintColor={tintColor}
										/>
									</PressableFeedback>
								) : null}
								{toneLabel && toneBadge ? (
									<View
										className={`-mt-3 rounded-full border px-2.5 py-0.5 ${toneBadge.border}`}
									>
										<AppText className={`text-xs ${toneBadge.text}`}>
											{toneLabel}
										</AppText>
									</View>
								) : null}
							</View>
							<AppText
								className="mb-8 font-light text-foreground text-xl italic leading-9"
								selectable
							>
								&ldquo;{removeEmDash(details.mirrorText)}&rdquo;
							</AppText>
						</>
					)}

					{details.entryType === "talk" && sessionId && (
						<View className="mb-8">
							<SectionLabel>The talk</SectionLabel>
							<TalkTranscript
								name={details.companionName}
								sessionId={sessionId}
							/>
						</View>
					)}

					{/* Emotion row */}
					<View className="flex-row items-center gap-2">
						<AppText className="text-base">{emoji}</AppText>
						<AppText className="text-foreground/65 text-sm">
							{emotionLabel}
						</AppText>
						{pathLabel ? (
							<>
								<AppText className="text-foreground/25 text-sm">
									&middot;
								</AppText>
								<AppText className="text-foreground/40 text-sm">
									{pathLabel}
								</AppText>
							</>
						) : null}
					</View>
				</View>
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	continuousBorder: { borderCurve: "continuous" },
	scrollContent: { paddingBottom: 60 },
});
