import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import Settings from "@expo/material-symbols/settings.xml";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { AuroraArc } from "@/src/features/profile/components/aurora-arc";
import { ProfileSkeleton } from "@/src/features/profile/components/profile-skeleton";
import { ProfileHero } from "@/src/features/profile/components/profile-hero";
import { StatBand } from "@/src/features/profile/components/stat-band";
import { ContributionGraphCard } from "@/src/features/profile/components/contribution-graph-card";
import { EmotionChips } from "@/src/features/profile/components/emotion-chips";
import { MirrorLines } from "@/src/features/profile/components/mirror-lines";
import { RankCard } from "@/src/features/profile/components/rank-card";
import { WeekIntensityCard } from "@/src/features/profile/components/week-intensity-card";
import { WordsTeaserCard } from "@/src/features/profile/components/words-teaser-card";
import { WordsTeaserEmpty } from "@/src/features/profile/components/words-teaser-empty";
import { FollowUpsSection } from "@/src/features/profile/components/follow-ups-section";
import { PlusRow } from "@/src/features/profile/components/plus-row";
import { PlusInsightOffer } from "@/src/features/profile/components/plus-insight-offer";
import { AvatarPickerSheet } from "@/src/features/profile/components/avatar-picker-sheet";
import { SteadinessRow } from "@/src/features/insights/steadiness-row";
import { useProfileSummary } from "@/src/features/profile/hooks/use-profile-summary";
import { useMoodDelta } from "@/src/features/profile/hooks/use-mood-delta";
import { useWeekIntensity } from "@/src/features/profile/hooks/use-week-intensity";
import { useInsightGate } from "@/src/features/profile/hooks/use-insight-gate";
import { useReflectionRank } from "@/src/features/profile/hooks/use-reflection-rank";
import { useAvatars, resolveAvatar } from "@/src/features/profile/hooks/use-avatars";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const summary = useProfileSummary();
  const moodDelta = useMoodDelta();
  const rank = useReflectionRank();
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
  const hasEnoughForChips = sessionCount >= 1 && (summary?.dominantEmotionTags?.length ?? 0) > 0;
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
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerShadowVisible: false,
          headerBackVisible: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={process.env.EXPO_OS === "ios" ? "gearshape" : Settings}
          onPress={() => router.push("/settings")}
        />
      </Stack.Toolbar>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="bg-transparent"
        contentContainerStyle={{
          paddingTop: insets.top + 36,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {!summary && <ProfileSkeleton />}

        {summary && (
          <ProfileHero
            displayName={summary.displayName}
            firstSessionAt={summary.firstSessionAt}
            sessionCount={summary.sessionCount}
            avatarUrl={currentAvatar?.url ?? null}
            avatarKey={currentAvatar?.key ?? null}
            avatarLabel={currentAvatar?.label}
            onAvatarPress={avatars && avatars.length > 0 ? () => setPickerOpen(true) : undefined}
          />
        )}

        {sessionCount > 0 && summary && (
          <StatBand
            sessionCount={summary.sessionCount}
            currentStreak={summary.currentStreak}
            longestStreak={summary.longestStreak}
            usualDay={usualDay}
            staggerDelay={120}
          />
        )}

        {/* Visible from sign-up: join day is day one, an empty grid otherwise. */}
        {summary && <ContributionGraphCard staggerDelay={150} />}

        {/* A standing door, never rate-limited — but pointless once they're in.
            `isPlus` is false while entitlement resolves, so waiting on the read
            keeps a subscriber from watching an upsell mount and disappear. */}
        {!gate.isLoading && !gate.isPlus && <PlusRow staggerDelay={160} />}

        {hasEnoughForChips && summary && (
          <EmotionChips tags={summary.dominantEmotionTags} staggerDelay={180} />
        )}

        {hasEnoughForMirrorLines && (
          <MirrorLines
            moodDelta={moodDelta ?? null}
            typicalPattern={hasEnoughForRhythm ? (summary?.typicalUsagePattern ?? null) : null}
            staggerDelay={240}
          />
        )}

        {/* The rank card renders from session zero, so the section header must
            too — otherwise a new user sees a lone card with no heading. */}
        {(hasEnoughForChart || rank) && (
          <EaseView
            initialAnimate={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 280, easing: EASE, delay: 280 }}
          >
            <View className="flex-row items-center px-6 mt-10 mb-6 gap-3">
              <View className="flex-1 h-px bg-separator/55" />
              <AppText className="text-[10px] text-muted tracking-widest uppercase">
                your insights
              </AppText>
              <View className="flex-1 h-px bg-separator/55" />
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

        {hasEnoughForChart && weekIntensity && (
          <WeekIntensityCard
            days={weekIntensity.days}
            peakDay={weekIntensity.peakDay}
            hasData={weekIntensity.hasData}
            momentsTotal={sessionCount}
            isPlus={gate.isPlus}
            weekLabel={weekIntensity.weekLabel}
            isCurrentWeek={weekIntensity.weekOffset === 0}
            isEarliestWeek={weekIntensity.isEarliestWeek}
            onPrevWeek={() => setWeekOffset((w) => w - 1)}
            onNextWeek={() => setWeekOffset((w) => Math.min(0, w + 1))}
            onView={() => gate.trackView("intensity_history")}
            onUnlock={() => gate.open("intensity_history")}
            staggerDelay={360}
          />
        )}

        {hasEnoughForWords && summary && (
          <View className="mt-4">
            <WordsTeaserCard
              words={summary.recentWords}
              isPlus={gate.isPlus}
              onView={() => gate.trackView("words_language")}
              onUnlock={() => gate.open("words_language")}
              staggerDelay={420}
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

      <AvatarPickerSheet
        isOpen={pickerOpen}
        avatars={avatars}
        currentKey={summary?.avatarId ?? null}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
