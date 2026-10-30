import { useState } from "react";
import { View } from "react-native";
import { Tabs } from "react-native-collapsible-tab";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SteadinessRow } from "@/features/insights/steadiness-row";
import { ContributionGraphCard } from "@/features/profile/components/contribution-graph-card";
import { EmotionChips } from "@/features/profile/components/emotion-chips";
import { MirrorLines } from "@/features/profile/components/mirror-lines";
import { PlusInsightOffer } from "@/features/profile/components/plus-insight-offer";
import { PlusRow } from "@/features/profile/components/plus-row";
import { RankCard } from "@/features/profile/components/rank-card";
import { WeekIntensityCard } from "@/features/profile/components/week-intensity-card";
import { WordsTeaserCard } from "@/features/profile/components/words-teaser-card";
import { WordsTeaserEmpty } from "@/features/profile/components/words-teaser-empty";
import { useInsightGate } from "@/features/profile/hooks/use-insight-gate";
import { useMoodDelta } from "@/features/profile/hooks/use-mood-delta";
import type { ProfileSummary } from "@/features/profile/hooks/use-profile-summary";
import { useReflectionRank } from "@/features/profile/hooks/use-reflection-rank";
import { useWeekIntensity } from "@/features/profile/hooks/use-week-intensity";
import { useAppStore } from "@/store/store";

/** The Insights tab: the user's own patterns, each card gated on enough sessions
 * to say something true. */
export function InsightsTab({
	summary,
}: {
	summary: ProfileSummary | undefined;
}) {
	const insets = useSafeAreaInsets();
	const moodDelta = useMoodDelta();
	const hidden = useAppStore((s) => s.hiddenProfileCards);
	const fetchedRank = useReflectionRank();
	const rank = hidden.includes("rank") ? undefined : fetchedRank;
	const [weekOffset, setWeekOffset] = useState(0);

	const sessionCount = summary?.sessionCount ?? 0;
	const gate = useInsightGate(sessionCount);
	// Lapsed Plus mid-navigation must not strand the query on a locked week:
	// derive the effective offset from the current entitlement.
	const weekIntensity = useWeekIntensity(gate.isPlus ? weekOffset : 0);
	const hasEnoughForChips =
		sessionCount >= 1 && (summary?.dominantEmotionTags?.length ?? 0) > 0;
	const hasEnoughForMirrorLines = sessionCount >= 3;
	const hasEnoughForRhythm = sessionCount >= 5;
	const hasEnoughForChart = sessionCount >= 1;
	// Three distinct recurring words make every teaser row genuine; below that,
	// the honest empty state once the user has at least one session.
	const wordCount = summary?.wordCount ?? 0;
	const hasEnoughForWords = wordCount >= 3;
	const showWordsEmpty = sessionCount >= 1 && !hasEnoughForWords;

	return (
		<Tabs.ScrollView
			contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
			showsVerticalScrollIndicator={false}
		>
			{/* Visible from sign-up: join day is day one, an empty grid otherwise. */}
			{summary && !hidden.includes("calendar") && (
				<ContributionGraphCard staggerDelay={150} />
			)}

			{/* `isPlus` is false while entitlement resolves; waiting on the read keeps
          a subscriber from watching an upsell mount and disappear. */}
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

			{hasEnoughForChart && (
				<View className="mt-8">
					<SteadinessRow />
				</View>
			)}

			{/* Widest lens first. Always rendered: the card carries its own pending state. */}
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
		</Tabs.ScrollView>
	);
}
