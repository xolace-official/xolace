import { SymbolView } from "expo-symbols";
import { PressableFeedback, Surface } from "heroui-native";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { interpolate, interpolateColor } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";
import { CardInfo } from "./card-info";
import { GateFade } from "./gate-fade";

const INTENSITY_INFO_FREE =
	"Each bar is how heavy your moments felt that day; averaged from the intensity (1-10) of what you brought. Only this week shows in full; browsing earlier weeks is part of Xolace+.";
const INTENSITY_INFO_PLUS =
	"Each bar is how heavy your moments felt that day; averaged from the intensity (1-10) of what you brought. Use the arrows below to browse earlier weeks.";

type DayData = {
	label: string;
	dayName: string;
	intensity: number | null;
	isToday: boolean;
};

type Props = {
	days: DayData[];
	peakDay: string | null;
	hasData: boolean;
	momentsTotal: number;
	isPlus: boolean;
	weekLabel: string;
	isCurrentWeek: boolean;
	isEarliestWeek: boolean;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	onUnlock: () => void;
	onView: () => void;
	staggerDelay?: number;
};

const BAR_MAX_H = 80;
const BAR_MIN_H = 5;
const GATE_H = 64;
const CARD_INSET = 40; // card is mx-5 → 20px each side

// Height and colour are plain styles and the grow-in is a native scaleY ending
// at 1: on some TestFlight devices a Reanimated spring never landed and every
// bar stayed flat, so a missed animation must still leave the bar full height.
function IntensityBar({
	intensity,
	isToday,
	isPeak,
	accentHex,
	emberHex,
}: {
	intensity: number | null;
	isToday: boolean;
	isPeak: boolean;
	accentHex: string;
	emberHex: string;
}) {
	const reduced = useEffectiveReducedMotion();
	if (intensity === null) {
		return (
			<View
				className="rounded-md"
				style={{ backgroundColor: accentHex + "30", height: BAR_MIN_H }}
			/>
		);
	}

	const progress = intensity / 10;
	const height = interpolate(progress, [0, 1], [BAR_MIN_H, BAR_MAX_H]);
	// Low intensity → muted accent, high → ember
	const backgroundColor = interpolateColor(
		progress,
		[0, 0.5, 1],
		[accentHex + "28", accentHex + "99", emberHex]
	);

	return (
		<EaseView
			animate={{ scaleY: 1 }}
			initialAnimate={{ scaleY: reduced ? 1 : 0 }}
			style={{ height }}
			transformOrigin={{ x: 0.5, y: 1 }}
			transition={{ damping: 20, stiffness: 180, type: "spring" }}
		>
			<View
				style={[
					styles.bar,
					isToday || isPeak ? styles.barFull : styles.barDim,
					{ backgroundColor },
				]}
			/>
		</EaseView>
	);
}

// Frosted "earlier weeks" navigator, the single gated element (Model B): the
// current week reads free above. Tap opens the paywall.
function EarlierWeeksGate({
	width,
	onPress,
}: {
	width: number;
	onPress: () => void;
}) {
	const accent = useTokenColor("accent");
	const muted = useTokenColor("muted");

	return (
		<Pressable
			accessibilityLabel="See earlier weeks"
			accessibilityRole="button"
			onPress={onPress}
			style={{ height: GATE_H }}
		>
			{/* Transparent at top, soft accent frost at the bottom; no hard cutoff. */}
			<View className="absolute inset-0">
				<GateFade color={accent} endAlpha="42" height={GATE_H} width={width} />
			</View>

			<View className="flex-1 flex-row items-center justify-center gap-2.5 opacity-50">
				<SymbolView
					name={{
						android: "chevron_left",
						ios: "chevron.left",
						web: "chevron_left",
					}}
					size={11}
					tintColor={muted}
				/>
				<AppText className="text-[12px] tracking-wide" style={{ color: muted }}>
					Earlier weeks
				</AppText>
				<SymbolView
					name={{
						android: "chevron_right",
						ios: "chevron.right",
						web: "chevron_right",
					}}
					size={11}
					tintColor={muted}
				/>
			</View>
		</Pressable>
	);
}

// Functional week pager for Plus: same footprint as the free gate, unfrosted.
function WeekNav({
	weekLabel,
	canGoNext,
	canGoPrev,
	onPrevWeek,
	onNextWeek,
}: {
	weekLabel: string;
	canGoNext: boolean;
	canGoPrev: boolean;
	onPrevWeek: () => void;
	onNextWeek: () => void;
}) {
	const muted = useTokenColor("muted");
	const foreground = useTokenColor("foreground");

	return (
		<View
			className="flex-row items-center justify-center gap-4 border-border/55 border-t"
			style={{ height: GATE_H }}
		>
			<PressableFeedback
				accessibilityLabel="Previous week"
				accessibilityRole="button"
				hitSlop={10}
				isDisabled={!canGoPrev}
				onPress={onPrevWeek}
				style={canGoPrev ? styles.navChevron : styles.navChevronDisabled}
			>
				<SymbolView
					name={{
						android: "chevron_left",
						ios: "chevron.left",
						web: "chevron_left",
					}}
					size={13}
					tintColor={muted}
				/>
			</PressableFeedback>

			<AppText
				className="w-24 text-center text-[12px] tracking-wide"
				style={{ color: foreground }}
			>
				{weekLabel}
			</AppText>

			<PressableFeedback
				accessibilityLabel="Next week"
				accessibilityRole="button"
				hitSlop={10}
				isDisabled={!canGoNext}
				onPress={onNextWeek}
				style={canGoNext ? styles.navChevron : styles.navChevronDisabled}
			>
				<SymbolView
					name={{
						android: "chevron_right",
						ios: "chevron.right",
						web: "chevron_right",
					}}
					size={13}
					tintColor={muted}
				/>
			</PressableFeedback>
		</View>
	);
}

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

export function WeekIntensityCard({
	days,
	peakDay,
	hasData,
	momentsTotal,
	isPlus,
	weekLabel,
	isCurrentWeek,
	isEarliestWeek,
	onPrevWeek,
	onNextWeek,
	onUnlock,
	onView,
	staggerDelay = 300,
}: Props) {
	const { width } = useWindowDimensions();
	const accentHex = useTokenColor("accent");
	const emberHex = useTokenColor("ember");
	const mutedHex = useTokenColor("muted");
	const reduced = useEffectiveReducedMotion();

	const viewed = useRef(false);
	useEffect(() => {
		if (viewed.current) {
			return;
		}
		viewed.current = true;
		onView();
	}, [onView]);

	const momentLabel = `${momentsTotal} ${momentsTotal === 1 ? "moment" : "moments"}`;

	return (
		<EaseView
			animate={{ opacity: 1, translateY: 0 }}
			className="mx-5"
			initialAnimate={{ opacity: 0, translateY: reduced ? 0 : 8 }}
			transition={{
				delay: staggerDelay,
				duration: 280,
				easing: EASE,
				type: "timing",
			}}
		>
			<Surface className="p-0">
				<View className="px-5 pt-5 pb-4">
					<View className="mb-5 flex-row items-center gap-1.5">
						<AppText className="font-medium text-[11px] text-muted uppercase tracking-widest">
							{weekLabel}
						</AppText>
						<CardInfo
							description={isPlus ? INTENSITY_INFO_PLUS : INTENSITY_INFO_FREE}
							title={weekLabel}
						/>
					</View>

					{/* Always rendered (flat baseline bars when empty) so the card never reads
					    as fully gated. */}
					<View className="flex-row" style={{ height: BAR_MAX_H + 20 }}>
						<View className="flex-1 flex-row items-end gap-1.5">
							{days.map((d) => (
								<View className="flex-1 items-center gap-1.5" key={d.dayName}>
									<View className="w-full flex-1 justify-end">
										<IntensityBar
											accentHex={accentHex}
											emberHex={emberHex}
											intensity={d.intensity}
											isPeak={d.dayName === peakDay}
											isToday={d.isToday}
										/>
									</View>
									<AppText
										className="text-[10px]"
										style={{ color: d.isToday ? emberHex : mutedHex + "88" }}
									>
										{d.label}
									</AppText>
								</View>
							))}
						</View>

						{/* Bottom inset reserves the day-label row so "Minimal" lands on the
						    bar baseline. */}
						<View
							className="justify-between pb-5 pl-3"
							style={{ height: BAR_MAX_H + 20 }}
						>
							{["High", "Moderate", "Mild", "Minimal"].map((lbl) => (
								<AppText
									className="text-right font-medium text-[9px]"
									key={lbl}
									style={{ color: mutedHex + "85" }}
								>
									{lbl}
								</AppText>
							))}
						</View>
					</View>

					{hasData ? (
						peakDay && (
							<AppText className="mt-2 text-muted text-xs">
								Intensity peaked {peakDay}
							</AppText>
						)
					) : isCurrentWeek ? (
						<AppText className="mt-2 text-muted text-xs leading-5">
							{momentLabel} so far — this week&apos;s shape is still forming.
						</AppText>
					) : (
						<AppText className="mt-2 text-muted text-xs leading-5">
							No moments logged that week.
						</AppText>
					)}
				</View>

				{isPlus ? (
					<WeekNav
						canGoNext={!isCurrentWeek}
						canGoPrev={!isEarliestWeek}
						onNextWeek={onNextWeek}
						onPrevWeek={onPrevWeek}
						weekLabel={weekLabel}
					/>
				) : (
					/* The only gated element for free tier: paging into earlier weeks. */
					<EarlierWeeksGate onPress={onUnlock} width={width - CARD_INSET} />
				)}
			</Surface>
		</EaseView>
	);
}

const styles = StyleSheet.create({
	bar: { borderCurve: "continuous", borderRadius: 8, flex: 1 },
	barDim: { opacity: 0.65 },
	barFull: { opacity: 1 },
	navChevron: { opacity: 1 },
	navChevronDisabled: { opacity: 0.3 },
});
