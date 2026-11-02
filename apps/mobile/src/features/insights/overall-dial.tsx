// The hero: overall steadiness as a fan of ticks that fill in on mount (#491), with the
// Xolace face in the middle and the number small under it. Lit at two unlocked domains;
// before that, a waiting face in the empty fan and one line of presence.
// Xolace+: the overall steadiness insights sit under it (#526).

import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";
import type { Insight } from "@/features/insights/domains";
import { TickGauge } from "@/features/insights/glass";
import { SteadinessFace } from "@/features/insights/steadiness-face";
import { SteadinessInsights } from "@/features/insights/steadiness-insights";
import { LockedTrendChip, TrendChip } from "@/features/insights/trend-chip";
import { useTokenColor } from "@/lib/use-token-color";

const FACE_SIZE = 100;

type Props = {
	overall: number | null;
	/** Xolace+ only; null hides it (quiet week, under 2 domains). */
	trend?: number | null;
	/** Set when the trend runs from quiet domains' last reading: "since <month>". */
	trendSince?: number | null;
	/** Free view: the chip is a locked upsell instead. */
	locked: boolean;
	insights?: Insight[];
};

export function OverallDial({
	overall,
	trend,
	trendSince,
	locked,
	insights,
}: Props) {
	const accent = useTokenColor("accent");
	const track = useTokenColor("border");
	const muted = useTokenColor("muted");
	const progress = useSharedValue(0);
	const swelled = useRef(false);

	useEffect(() => {
		if (overall === null) {
			return;
		}
		// A rising swell as the ticks first fill, once per visit; a reactive update
		// just moves the ticks.
		if (!swelled.current) {
			Presets.swell();
		}
		swelled.current = true;
		progress.set(
			withTiming(overall / 100, {
				duration: 1100,
				easing: Easing.out(Easing.cubic),
			})
		);
	}, [overall, progress]);

	return (
		<GlassSurface className="items-center gap-3 py-6">
			<Pressable
				accessibilityLabel="Reading the face"
				accessibilityRole="button"
				className="absolute top-4 right-4 z-10 p-1 active:opacity-60"
				hitSlop={8}
				onPress={() => router.push("/steadiness-face-info")}
			>
				<SymbolView
					name={{ android: "info", ios: "info.circle", web: "info" }}
					size={22}
					tintColor={muted}
				/>
			</Pressable>
			{/* The 270° sweep leaves its bottom quarter empty; tuck what follows up into it.
			    Waiting, the line under it says what the empty fan means. */}
			<View
				accessibilityLabel={
					overall === null
						? undefined
						: `Overall steadiness, ${overall} out of 100`
				}
				accessible={overall !== null}
				className="-mb-7"
			>
				<TickGauge
					fill={accent}
					progress={progress}
					radius={118}
					startAngle={135}
					sweep={270}
					tickLength={20}
					ticks={56}
					tickWidth={4}
					track={track}
				>
					<SteadinessFace overall={overall} size={FACE_SIZE} />
					{overall !== null && (
						<View className="flex-row items-baseline">
							<AppText className="font-bold text-[34px] leading-[40px] tracking-tight">
								{overall}
							</AppText>
							<AppText className="text-[12px] text-muted">/100</AppText>
						</View>
					)}
				</TickGauge>
			</View>
			{overall === null && (
				<AppText className="px-8 pt-4 text-center text-[15px] text-foreground/75 leading-6">
					Lights up once Xolace knows two parts of your life.
				</AppText>
			)}
			{overall !== null && (locked || trend != null) && (
				<View className="self-center">
					{locked ? (
						<LockedTrendChip />
					) : (
						<TrendChip delta={trend!} since={trendSince} />
					)}
				</View>
			)}
			{overall !== null && (
				<View className="self-stretch px-5">
					<SteadinessInsights insights={insights} />
				</View>
			)}
		</GlassSurface>
	);
}
