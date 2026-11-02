import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import * as StoreReview from "expo-store-review";
import { Button } from "heroui-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { Button as ThemedButton } from "@/components/shared/playful-button";
import { SessionEndUpsell } from "@/features/insights/compounding-upsell";
import { NIGHT_SESSION_END_ACTIVITY } from "@/features/night-mode/night-copy";
import { CloseOffer } from "@/features/session-end/components/close-offer";
import { ContributedConfirmation } from "@/features/session-end/components/contributed-confirmation";
import { HeavierFeedbackPrompt } from "@/features/session-end/components/heavier-feedback-prompt";
import { KindlingCloseSlot } from "@/features/session-end/components/kindling-close-slot";
import { MoodCheckIn } from "@/features/session-end/components/mood-check-in";
import { UnsureFeedbackPrompt } from "@/features/session-end/components/unsure-feedback-prompt";
import { heavierIntensity, SAME } from "@/features/session-end/mood-scale";

type PostSessionMood = "lighter" | "same" | "heavier" | "unsure";
type Phase = "acknowledge" | "mood" | "offer" | "close" | "contributed";

type Props = {
	sessionId?: Id<"sessions">;
	distilledText: string | null;
	contributeByDefault: boolean;
	onDismiss: (
		contributedReflection: boolean | null,
		mood?: PostSessionMood,
		moodPosition?: number
	) => void;
	onHaveMore: (
		contributedReflection: boolean | null,
		mood?: PostSessionMood,
		moodPosition?: number
	) => void;
	onOpenKindling: (
		ready: boolean,
		contributedReflection: boolean | null,
		mood?: PostSessionMood,
		moodPosition?: number
	) => void;
	isNight?: boolean;
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
	onOpenKindling,
	isNight = false,
}: Props) => {
	const [phase, setPhase] = useState<Phase>("acknowledge");
	const [selectedMood, setSelectedMood] = useState<PostSessionMood | null>(
		null
	);
	// Where the slider was let go, 0 heavier … 1 lighter; null for "not sure" or no answer.
	const [moodPosition, setMoodPosition] = useState<number | null>(null);
	const [contributed, setContributed] = useState<boolean | null>(null);
	const [heavierSheetOpen, setHeavierSheetOpen] = useState(false);
	const [unsureSheetOpen, setUnsureSheetOpen] = useState(false);
	const canAsk = useQuery(api.feedback.canAskContextual);
	const canAskUnsure = useQuery(api.feedback.canAskUnsureContextual);

	const nextAfterMood = distilledText ? "offer" : "close";

	const advancePhase = () => {
		if (phase === "acknowledge") {
			setPhase(isNight ? (distilledText ? "offer" : "close") : "mood");
		} else if (phase === "mood") {
			setPhase(nextAfterMood);
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

	const handleUnsure = () => {
		setSelectedMood("unsure");
		setMoodPosition(null);
		if (canAskUnsure === true) {
			setUnsureSheetOpen(true);
		}
	};

	// "Heavier" asks its follow-up on Continue, not on release, so a drag can be changed.
	const handleContinue = () => {
		if (selectedMood === "heavier" && canAsk === true) {
			setHeavierSheetOpen(true);
		} else {
			advancePhase();
		}
	};

	// Closing the follow-up, answered or not, moves on; the answer can't be changed after.
	// Idempotent: the sheet can report its close more than once.
	const handleHeavierClose = () => {
		setHeavierSheetOpen(false);
		setPhase((p) => (p === "mood" ? nextAfterMood : p));
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
			{phase === "acknowledge" && (
				<Pressable className="flex-1 px-8 pb-8" onPress={advancePhase}>
					{/* TODO(mascot-video): Replace Image with VideoView once expo-video is
					    installed in a store release. See TODOS.md — "Looping Mascot Video on
					    Acknowledge Phase". */}
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
						<View className="px-8 pt-14 pb-8">
							<AppText className="mb-2 font-serif text-3xl text-foreground">
								How do you feel now?
							</AppText>
							<AppText className="font-light text-foreground/40 text-sm leading-5">
								Your answer stays private. It helps you notice patterns over
								time.
							</AppText>
						</View>

						<MoodCheckIn
							onAnswer={(mood, position) => {
								setSelectedMood(mood);
								setMoodPosition(position);
							}}
							onUnsure={handleUnsure}
							unsure={selectedMood === "unsure"}
						/>

						<View className="px-8 pt-3 pb-8">
							{/* Playful's raised lip there, the theme's filled button elsewhere. */}
							<ThemedButton
								accessibilityLabel={selectedMood ? "Continue" : "Skip for now"}
								className="w-full"
								onPress={handleContinue}
								size="lg"
								variant={selectedMood ? "primary" : "secondary"}
							>
								<ThemedButton.Label>
									{selectedMood ? "Continue" : "Skip for now"}
								</ThemedButton.Label>
							</ThemedButton>
						</View>
					</EaseView>
				</ScrollView>
			)}

			{phase === "offer" && distilledText && (
				<View className="flex-1">
					<EaseView
						animate={SLIDE_IN}
						className="flex-1"
						initialAnimate={SLIDE_OUT}
						transition={EASE_IN}
					>
						<View className="px-8 pt-14 pb-8">
							<AppText className="mb-2 font-serif text-3xl text-foreground">
								Leave it for someone.
							</AppText>
							<AppText className="font-light text-foreground/40 text-sm leading-5">
								Someone out there might be carrying something just like this.
							</AppText>
						</View>

						<View className="mx-8 mb-6 rounded-2xl border border-foreground/55 bg-surface/40 px-8 py-4">
							<AppText className="font-light text-foreground/55 text-sm italic leading-6">
								{`"${distilledText}"`}
							</AppText>
						</View>

						<View className="flex-1" />

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
						<KindlingCloseSlot
							onOpenKindling={(ready) =>
								onOpenKindling(
									ready,
									contributed,
									selectedMood ?? undefined,
									moodPosition ?? undefined
								)
							}
							sessionId={sessionId}
						/>
						<Button
							accessibilityLabel="Start another session"
							className="w-full rounded-2xl"
							onPress={() =>
								onHaveMore(
									contributed,
									selectedMood ?? undefined,
									moodPosition ?? undefined
								)
							}
							size="lg"
							variant="primary"
						>
							<Button.Label>Start another session</Button.Label>
						</Button>

						<Button
							accessibilityLabel="I'm done for now"
							className="w-full rounded-2xl"
							onPress={() =>
								onDismiss(
									contributed,
									selectedMood ?? undefined,
									moodPosition ?? undefined
								)
							}
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
				intensity={Math.max(1, heavierIntensity(moodPosition ?? SAME))}
				isOpen={heavierSheetOpen}
				onClose={handleHeavierClose}
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
