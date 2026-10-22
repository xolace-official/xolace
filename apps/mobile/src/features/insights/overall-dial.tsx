// The hero: overall steadiness as a fan of ticks that fill in on mount (#491).
// Lit at two unlocked domains; before that, one line of presence instead.
// Xolace+: the overall steadiness insights sit under it (#526).

import { SymbolView } from "expo-symbols";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { GAUGE, type Insight } from "@/src/features/insights/domains";
import { TickGauge } from "@/src/features/insights/glass";
import { SteadinessInsights } from "@/src/features/insights/steadiness-insights";
import { LockedTrendChip, TrendChip } from "@/src/features/insights/trend-chip";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";

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
	const progress = useSharedValue(0);
	const swelled = useRef(false);

	useEffect(() => {
		if (overall === null) {
			return;
		}
		// A rising swell as the ticks first fill: the number arriving, not a reward.
		// Once per visit — a reactive update just moves the ticks.
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
			{overall === null ? (
				<AppText className="px-8 text-center text-[15px] text-foreground/75 leading-6">
					Your overall steadiness lights up once Xolace knows two parts of your
					life.
				</AppText>
			) : (
				// The 270° sweep leaves its bottom quarter empty; tuck the card up into it.
				<View
					accessible
					accessibilityLabel={`Overall steadiness, ${overall} out of 100`}
					className="-mb-7"
				>
					<TickGauge
						ticks={56}
						startAngle={135}
						sweep={270}
						radius={118}
						tickLength={20}
						tickWidth={4}
						progress={progress}
						fill={accent}
						track={track}
					>
						<View className="flex-row items-center gap-1.5">
							<SymbolView name={GAUGE} size={14} tintColor={accent} />
							<AppText className="text-[14px] text-accent">overall</AppText>
						</View>
						<AppText className="font-bold text-[68px] leading-[76px] tracking-tight">
							{overall}
						</AppText>
						<AppText className="-mt-1 text-[12px] text-muted">/100</AppText>
					</TickGauge>
				</View>
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
