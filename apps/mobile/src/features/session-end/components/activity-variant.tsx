import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import * as StoreReview from "expo-store-review";
import { Button, PressableFeedback } from "heroui-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { SessionEndUpsell } from "@/features/insights/compounding-upsell";
import { NIGHT_SESSION_END_ACTIVITY } from "@/features/night-mode/night-copy";
import { CloseOffer } from "@/features/session-end/components/close-offer";
import { ContributedConfirmation } from "@/features/session-end/components/contributed-confirmation";
import { HeavierFeedbackPrompt } from "@/features/session-end/components/heavier-feedback-prompt";
import { KindlingCloseSlot } from "@/features/session-end/components/kindling-close-slot";
import { UnsureFeedbackPrompt } from "@/features/session-end/components/unsure-feedback-prompt";

type PostSessionMood = "lighter" | "same" | "heavier" | "unsure";
type Phase = "acknowledge" | "mood" | "offer" | "close" | "contributed";

type Props = {
	sessionId?: Id<"sessions">;
	distilledText: string | null;
	contributeByDefault: boolean;
	onDismiss: (
		contributedReflection: boolean | null,
		mood?: PostSessionMood
	) => void;
	onHaveMore: (
		contributedReflection: boolean | null,
		mood?: PostSessionMood
	) => void;
	isNight?: boolean;
};

const MOODS = ["lighter", "same", "heavier", "unsure"] as const;

const MOOD_LABELS: Record<PostSessionMood, string> = {
	heavier: "heavier",
	lighter: "lighter",
	same: "the same",
	unsure: "not sure",
};

const MOOD_HAPTICS: Record<PostSessionMood, () => void> = {
	heavier: () => Presets.plunk(),
	lighter: () => Presets.chirp(),
	same: () => Presets.plink(),
	unsure: () => Presets.murmur(),
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_SLOW = { duration: 600, easing: EASING, type: "timing" as const };
const EASE_IN = {
	delay: 200,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const FADE_OUT = { opacity: 0 };
const FADE_IN = { opacity: 1 };
const SLIDE_OUT = { opacity: 0, translateY: 24 };
const SLIDE_IN = { opacity: 1, translateY: 0 };

const SCROLL_CONTENT = { flexGrow: 1 as const };

const styles = StyleSheet.create({
	mascot: {
		flex: 1,
		width: "100%",
	},
});

export const ActivityVariant = ({
	sessionId,
	distilledText,
	contributeByDefault,
	onDismiss,
	onHaveMore,
	isNight = false,
}: Props) => {
	const [phase, setPhase] = useState<Phase>("acknowledge");
	const [selectedMood, setSelectedMood] = useState<PostSessionMood | null>(
		null
	);
	const [contributed, setContributed] = useState<boolean | null>(null);
	const [heavierSheetOpen, setHeavierSheetOpen] = useState(false);
	const [unsureSheetOpen, setUnsureSheetOpen] = useState(false);
	const canAsk = useQuery(api.feedback.canAskContextual);
	const canAskUnsure = useQuery(api.feedback.canAskUnsureContextual);

	const advancePhase = () => {
		if (phase === "acknowledge") {
			setPhase(isNight ? (distilledText ? "offer" : "close") : "mood");
		} else if (phase === "mood") {
			setPhase(distilledText ? "offer" : "close");
		} else if (phase === "offer") {
			setPhase("close");
		}
	};

	useEffect(() => {
		if (phase !== "acknowledge") {
			return;
		}
		const timer = setTimeout(() => {
			setPhase(isNight ? (distilledText ? "offer" : "close") : "mood");
		}, 4500);
		return () => clearTimeout(timer);
	}, [phase, isNight, distilledText]);

	useEffect(() => {
		if (phase === "close" && selectedMood === "lighter") {
			StoreReview.isAvailableAsync()
				.then((ok) => {
					if (ok) {
						return StoreReview.requestReview();
					}
				})
				.catch(console.error);
		}
	}, [phase, selectedMood]);

	const handleMoodPress = (mood: PostSessionMood) => {
		MOOD_HAPTICS[mood]();
		setSelectedMood(mood);
		// Open feedback sheets without blocking phase flow
		if (mood === "heavier" && canAsk === true) {
			setHeavierSheetOpen(true);
		}
		if (mood === "unsure" && canAskUnsure === true) {
			setUnsureSheetOpen(true);
		}
	};

	if (phase === "contributed") {
		return (
			<ContributedConfirmation
				onDone={() => {
					setContributed(true);
					setPhase("close");
				}}
			/>
		);
	}

	return (
		<View className="flex-1">
			{/* ── Phase 1: Acknowledgment ── */}
			{phase === "acknowledge" && (
				<Pressable className="flex-1 px-8 pb-8" onPress={advancePhase}>
					{/* TODO(mascot-video): Replace Image with VideoView once expo-video is installed in a store release. See TODOS.md — "Looping Mascot Video on Acknowledge Phase". */}
					<Image
						contentFit="contain"
						source={require("@/assets/images/flux/jump-love-bgremove.png")}
						style={styles.mascot}
					/>
					<EaseView
						animate={FADE_IN}
						initialAnimate={FADE_OUT}
						transition={EASE_SLOW}
					>
						<AppText className="font-serif text-3xl text-foreground leading-10">
							{isNight
								? NIGHT_SESSION_END_ACTIVITY
								: "You showed up for\nyourself today."}
						</AppText>
					</EaseView>
				</Pressable>
			)}

			{/* ── Phase 2: Mood Check ── */}
			{phase === "mood" && (
				<ScrollView
					className="flex-1"
					contentContainerStyle={SCROLL_CONTENT}
					showsVerticalScrollIndicator={false}
				>
					<EaseView
						animate={SLIDE_IN}
						className="flex-1"
						initialAnimate={SLIDE_OUT}
						transition={EASE_IN}
					>
						{/* Header */}
						<View className="px-8 pt-14 pb-8">
							<AppText className="mb-2 font-serif text-3xl text-foreground">
								How do you feel now?
							</AppText>
							<AppText className="font-light text-foreground/40 text-sm leading-5">
								Your answer stays private. It helps you notice patterns over
								time.
							</AppText>
						</View>

						{/* Mood pills */}
						<View className="gap-4 px-8">
							{MOODS.map((mood) => (
								<PressableFeedback
									accessibilityLabel={MOOD_LABELS[mood]}
									className={`w-full rounded-2xl border px-5 py-4 ${
										selectedMood === mood
											? "border-accent/40 bg-accent/10"
											: "border-border/65 bg-surface/30"
									}`}
									key={mood}
									onPress={() => handleMoodPress(mood)}
								>
									<AppText
										className={`text-center text-base ${
											selectedMood === mood
												? "font-medium text-accent"
												: "font-light text-foreground/55"
										}`}
									>
										{MOOD_LABELS[mood]}
									</AppText>
								</PressableFeedback>
							))}
						</View>

						{/* Spacer pushes CTA to bottom */}
						<View className="flex-1" />

						{/* Pinned CTA */}
						<View className="px-8 pt-6 pb-12">
							<Button
								accessibilityLabel={selectedMood ? "Continue" : "Skip for now"}
								className={`w-full rounded-2xl ${
									selectedMood
										? "border-foreground/20 bg-foreground/5"
										: "border-border/40"
								}`}
								onPress={advancePhase}
								size="lg"
								variant="outline"
							>
								<Button.Label
									className={`text-sm ${
										selectedMood ? "text-foreground/70" : "text-foreground/25"
									}`}
								>
									{selectedMood ? "Continue" : "Skip for now"}
								</Button.Label>
							</Button>
						</View>
					</EaseView>
				</ScrollView>
			)}

			{/* ── Phase 3: The Offer ── */}
			{phase === "offer" && distilledText && (
				<View className="flex-1">
					<EaseView
						animate={SLIDE_IN}
						className="flex-1"
						initialAnimate={SLIDE_OUT}
						transition={EASE_IN}
					>
						{/* Header */}
						<View className="px-8 pt-14 pb-8">
							<AppText className="mb-2 font-serif text-3xl text-foreground">
								Leave it for someone.
							</AppText>
							<AppText className="font-light text-foreground/40 text-sm leading-5">
								Someone out there might be carrying something just like this.
							</AppText>
						</View>

						{/* Distilled text card */}
						<View className="mx-8 mb-6 rounded-2xl border border-foreground/55 bg-surface/40 px-8 py-4">
							<AppText className="font-light text-foreground/55 text-sm italic leading-6">
								{`"${distilledText}"`}
							</AppText>
						</View>

						{/* Spacer */}
						<View className="flex-1" />

						{/* Action buttons pinned at bottom */}
						<View className="gap-3 px-8 pb-12">
							<Button
								accessibilityLabel="Yes, share anonymously"
								className={`w-full rounded-2xl ${
									contributeByDefault ? "border-accent/40 bg-accent/20" : ""
								}`}
								onPress={() => setPhase("contributed")}
								size="lg"
								variant={contributeByDefault ? "outline" : "primary"}
							>
								<Button.Label
									className={`text-base ${
										contributeByDefault ? "font-medium text-accent" : ""
									}`}
								>
									Yes, anonymously
								</Button.Label>
							</Button>
							<Button
								accessibilityLabel="Not this time"
								className="w-full rounded-2xl"
								onPress={() => {
									setContributed(false);
									advancePhase();
								}}
								size="lg"
								variant="ghost"
							>
								<Button.Label className="font-light text-foreground/30 text-sm">
									Not this time
								</Button.Label>
							</Button>
						</View>
					</EaseView>
				</View>
			)}

			{/* ── Phase 4: Close ── */}
			{phase === "close" && (
				<View className="flex-1 items-center justify-center px-8">
					<EaseView
						animate={FADE_IN}
						className="w-full items-center gap-5"
						initialAnimate={FADE_OUT}
						transition={EASE_IN}
					>
						<CloseOffer sessionId={sessionId} variant="activity" />
						<SessionEndUpsell sessionId={sessionId} />
						<KindlingCloseSlot sessionId={sessionId} />
						<Button
							accessibilityLabel="Start another session"
							className="w-full rounded-2xl"
							onPress={() => onHaveMore(contributed, selectedMood ?? undefined)}
							size="lg"
							variant="primary"
						>
							<Button.Label>Start another session</Button.Label>
						</Button>

						<Button
							accessibilityLabel="I'm done for now"
							className="w-full rounded-2xl"
							onPress={() => onDismiss(contributed, selectedMood ?? undefined)}
							size="lg"
							variant="outline"
						>
							<Button.Label className="text-foreground/70">
								I&apos;m done for now
							</Button.Label>
						</Button>
					</EaseView>
				</View>
			)}

			<HeavierFeedbackPrompt
				isOpen={heavierSheetOpen}
				onClose={() => setHeavierSheetOpen(false)}
				sessionId={sessionId}
			/>

			<UnsureFeedbackPrompt
				isOpen={unsureSheetOpen}
				onClose={() => setUnsureSheetOpen(false)}
				sessionId={sessionId}
			/>
		</View>
	);
};
