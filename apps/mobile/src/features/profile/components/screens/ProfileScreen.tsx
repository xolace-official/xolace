import Settings from "@expo/material-symbols/settings.xml";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { AuroraArc } from "@/components/shared/aurora-arc";
import { TopBlur } from "@/components/shared/top-blur";
import { SteadinessRow } from "@/features/insights/steadiness-row";
import { AvatarPickerSheet } from "@/features/profile/components/avatar-picker-sheet";
import { ContributionGraphCard } from "@/features/profile/components/contribution-graph-card";
import { EmotionChips } from "@/features/profile/components/emotion-chips";
import { FollowUpsSection } from "@/features/profile/components/follow-ups-section";
import { MirrorLines } from "@/features/profile/components/mirror-lines";
import { PlusInsightOffer } from "@/features/profile/components/plus-insight-offer";
import { PlusRow } from "@/features/profile/components/plus-row";
import { ProfileHero } from "@/features/profile/components/profile-hero";
import { ProfileSkeleton } from "@/features/profile/components/profile-skeleton";
import { RankCard } from "@/features/profile/components/rank-card";
import { StatBand } from "@/features/profile/components/stat-band";
import { WeekIntensityCard } from "@/features/profile/components/week-intensity-card";
import { WordsTeaserCard } from "@/features/profile/components/words-teaser-card";
import { WordsTeaserEmpty } from "@/features/profile/components/words-teaser-empty";
import {
	resolveAvatar,
	useAvatars,
} from "@/features/profile/hooks/use-avatars";
import { useInsightGate } from "@/features/profile/hooks/use-insight-gate";
import { useMoodDelta } from "@/features/profile/hooks/use-mood-delta";
import { useProfileSummary } from "@/features/profile/hooks/use-profile-summary";
import { useReflectionRank } from "@/features/profile/hooks/use-reflection-rank";
import { useWeekIntensity } from "@/features/profile/hooks/use-week-intensity";
import { useAppStore } from "@/store/store";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProfileScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const summary = useProfileSummary();
	const moodDelta = useMoodDelta();
	const hidden = useAppStore((s) => s.hiddenProfileCards);
	const fetchedRank = useReflectionRank();
	const rank = hidden.includes("rank") ? undefined : fetchedRank;
	const [weekOffset, setWeekOffset] = useState(0);
	const avatars = useAvatars();
	const [pickerOpen, setPickerOpen] = useState(false);

	const currentAvatar = resolveAvatar(avatars, summary?.avatarId);

	const sessionCount = summary?.sessionCount ?? 0;
	const gate = useInsightGate(sessionCount);
	// Lapsed Plus mid-navigation shouldn't strand the query on a locked week —
	// derive the effective offset from current entitlement instead of syncing
	// it back into state.
	const weekIntensity = useWeekIntensity(gate.isPlus ? weekOffset : 0);
	const hasEnoughForChips =
		sessionCount >= 1 && (summary?.dominantEmotionTags?.length ?? 0) > 0;
	const hasEnoughForMirrorLines = sessionCount >= 3;
	const hasEnoughForRhythm = sessionCount >= 5;
	const hasEnoughForChart = sessionCount >= 1;
	// Need 3 distinct recurring words so every teaser row is genuine — no
	// fabricated fallbacks. Below that, show the honest empty state once the
	// user has at least one session (their language just hasn't repeated yet).
	const wordCount = summary?.wordCount ?? 0;
	const hasEnoughForWords = wordCount >= 3;
	const showWordsEmpty = sessionCount >= 1 && !hasEnoughForWords;

	const usualDay =
		hasEnoughForRhythm && summary?.typicalUsagePattern
			? SHORT_DAYS[summary.typicalUsagePattern.dayOfWeek]
			: null;

	return (
		<View className="flex-1 bg-background">
			<AuroraArc height={insets.top + 280} />

			<Stack.Screen
				options={{
					animation: "slide_from_bottom",
					headerBackButtonDisplayMode: "minimal",
					headerBackVisible: true,
					headerShadowVisible: false,
					headerShown: true,
					headerTitle: "",
					headerTransparent: true,
				}}
			/>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					icon={process.env.EXPO_OS === "ios" ? "gearshape" : Settings}
					onPress={() => router.push("/settings")}
				/>
			</Stack.Toolbar>

			<ScrollView
				className="bg-transparent"
				contentContainerStyle={{
					paddingBottom: insets.bottom + 40,
					paddingTop: insets.top + 36,
				}}
				showsVerticalScrollIndicator={false}
			>
				{!summary && <ProfileSkeleton />}

				{summary && (
					<ProfileHero
						avatarKey={currentAvatar?.key ?? null}
						avatarLabel={currentAvatar?.label}
						avatarUrl={currentAvatar?.url ?? null}
						displayName={summary.displayName}
						firstSessionAt={summary.firstSessionAt}
						onAvatarPress={
							avatars && avatars.length > 0
								? () => setPickerOpen(true)
								: undefined
						}
						sessionCount={summary.sessionCount}
					/>
				)}

				{sessionCount > 0 && summary && (
					<StatBand
						currentStreak={summary.currentStreak}
						longestStreak={summary.longestStreak}
						sessionCount={summary.sessionCount}
						staggerDelay={120}
						usualDay={usualDay}
					/>
				)}

				{/* Visible from sign-up: join day is day one, an empty grid otherwise. */}
				{summary && !hidden.includes("calendar") && (
					<ContributionGraphCard staggerDelay={150} />
				)}

				{/* A standing door, never rate-limited — but pointless once they're in.
            `isPlus` is false while entitlement resolves, so waiting on the read
            keeps a subscriber from watching an upsell mount and disappear. */}
				{!(gate.isLoading || gate.isPlus) && <PlusRow staggerDelay={160} />}

				{hasEnoughForChips && summary && (
					<EmotionChips staggerDelay={180} tags={summary.dominantEmotionTags} />
				)}

				{hasEnoughForMirrorLines && (
					<MirrorLines
						moodDelta={moodDelta ?? null}
						staggerDelay={240}
						typicalPattern={
							hasEnoughForRhythm ? (summary?.typicalUsagePattern ?? null) : null
						}
					/>
				)}

				{/* The rank card renders from session zero, so the section header must
            too — otherwise a new user sees a lone card with no heading. */}
				{(hasEnoughForChart || rank) && (
					<EaseView
						animate={{ opacity: 1 }}
						initialAnimate={{ opacity: 0 }}
						transition={{
							delay: 280,
							duration: 280,
							easing: EASE,
							type: "timing",
						}}
					>
						<View className="mt-10 mb-6 flex-row items-center gap-3 px-6">
							<View className="h-px flex-1 bg-separator/55" />
							<AppText className="text-[10px] text-muted uppercase tracking-widest">
								your insights
							</AppText>
							<View className="h-px flex-1 bg-separator/55" />
						</View>
					</EaseView>
				)}

				{hasEnoughForChart && <SteadinessRow />}

				{/* Widest lens first: you among everyone, then your week, then your
            words. Always rendered — the card carries its own pending state. */}
				{rank && (
					<View className="mb-4">
						<RankCard rank={rank} staggerDelay={300} />
					</View>
				)}

				{hasEnoughForChart && weekIntensity && !hidden.includes("week") && (
					<WeekIntensityCard
						days={weekIntensity.days}
						hasData={weekIntensity.hasData}
						isCurrentWeek={weekIntensity.weekOffset === 0}
						isEarliestWeek={weekIntensity.isEarliestWeek}
						isPlus={gate.isPlus}
						momentsTotal={sessionCount}
						onNextWeek={() => setWeekOffset((w) => Math.min(0, w + 1))}
						onPrevWeek={() => setWeekOffset((w) => w - 1)}
						onUnlock={() => gate.open("intensity_history")}
						onView={() => gate.trackView("intensity_history")}
						peakDay={weekIntensity.peakDay}
						staggerDelay={360}
						weekLabel={weekIntensity.weekLabel}
					/>
				)}

				{hasEnoughForWords && summary && (
					<View className="mt-4">
						<WordsTeaserCard
							isPlus={gate.isPlus}
							onUnlock={() => gate.open("words_language")}
							onView={() => gate.trackView("words_language")}
							staggerDelay={420}
							words={summary.recentWords}
						/>
					</View>
				)}

				{showWordsEmpty && (
					<View className="mt-4">
						<WordsTeaserEmpty staggerDelay={420} />
					</View>
				)}

				<PlusInsightOffer />

				<FollowUpsSection staggerDelay={480} />
			</ScrollView>
			<TopBlur height={insets.top + 70} />

			<AvatarPickerSheet
				avatars={avatars}
				currentKey={summary?.avatarId ?? null}
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
			/>
		</View>
	);
}
