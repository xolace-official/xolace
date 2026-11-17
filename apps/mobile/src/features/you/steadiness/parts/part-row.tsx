import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	FadeIn,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "@/features/you/copy";
import { rise } from "@/features/you/steadiness/detail/rise";
import { KindlingRow, NoticedList } from "@/features/you/steadiness/notes";
import { DOMAIN_ICON } from "@/features/you/steadiness/parts/domain-icon";
import { Meter } from "@/features/you/steadiness/parts/meter";
import {
	type Domain,
	type PartView,
	tapOf,
	trendSay,
} from "@/features/you/steadiness/steadiness-model";
import { TrendChip } from "@/features/you/steadiness/trend-chip";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const CHEVRON = { android: "expand_more", ios: "chevron.down" } as const;
const CHEVRON_MS = 250;
const CHEVRON_EASE = Easing.bezier(0.23, 1, 0.32, 1);

export type RowProps = {
	plus: boolean;
	now: Date;
	/** The row open in place (Xolace+). */
	open: Domain | null;
	onTap: (part: PartView) => void;
	onKindling: () => void;
};

/** One part: its icon, name and line, the number and change (Xolace+), the meter; a Xolace+
 * row opens in place to its usual, what Xolace noticed and the kindling. */
export function Row({
	part,
	plus,
	now,
	open: openPart,
	onTap,
	onKindling,
	clock,
	index,
}: RowProps & {
	part: PartView;
	clock: SharedValue<number>;
	index: number;
}) {
	const tone = useTokenColor(part.tone === "muted" ? "subtle" : part.tone);
	const subtle = useTokenColor("subtle");
	const reduced = useEffectiveReducedMotion();
	const open = openPart === part.domain;
	const tappable = tapOf(part, plus, "list") !== "none";
	const opens = part.value !== null;
	const chev = useSharedValue(open ? 1 : 0);
	useEffect(() => {
		const to = open ? 1 : 0;
		chev.set(
			reduced
				? to
				: withTiming(to, {
						duration: CHEVRON_MS,
						easing: CHEVRON_EASE,
						...PLAY_AS_CHOSEN,
					})
		);
	}, [open, reduced, chev]);
	const chevStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${chev.get() * 180}deg` }],
	}));
	return (
		<View
			className={cn(
				"rounded-[16px] border-continuous",
				open ? "bg-surface-secondary" : "bg-transparent"
			)}
		>
			<PressScale
				accessibilityLabel={`${part.label}${opens ? `, ${open ? "expanded" : "collapsed"}` : ""}`}
				accessibilityRole={tappable ? "button" : undefined}
				accessibilityState={opens ? { expanded: open } : undefined}
				className="gap-3 p-3"
				disabled={!tappable}
				onPress={() => onTap(part)}
				scaleTo={0.98}
			>
				<View className="flex-row items-center gap-3">
					<View
						className={cn(
							"size-10 items-center justify-center rounded-[12px]",
							open ? "bg-background" : "bg-surface-secondary"
						)}
					>
						<Icon
							color={part.warming ? subtle : tone}
							name={DOMAIN_ICON[part.domain]}
							size={17}
						/>
					</View>
					<View className="flex-1 gap-px">
						<AppText
							className="text-[15px] leading-5"
							numberOfLines={1}
							variant="callout"
						>
							{part.name}
						</AppText>
						<AppText
							className={cn(
								"text-[12px] leading-4",
								part.emberSub ? "text-ember" : "text-subtle"
							)}
							numberOfLines={1}
							variant="caption"
						>
							{part.sub}
						</AppText>
					</View>
					{part.value === null ? null : (
						<AppText
							className="font-display-bold text-[20px] tabular-nums leading-6"
							variant="display"
						>
							{part.value}
						</AppText>
					)}
					{part.trend ? <TrendChip now={now} short trend={part.trend} /> : null}
					{opens ? (
						<Animated.View style={chevStyle}>
							<Icon color={subtle} name={CHEVRON} size={12} weight="semibold" />
						</Animated.View>
					) : null}
				</View>
				{part.warming ? null : (
					<Meter clock={clock} color={tone} index={index} part={part} />
				)}
			</PressScale>
			{open ? (
				<Animated.View
					className="gap-3 pr-3 pb-3.5 pl-16"
					entering={reduced ? FadeIn.duration(150) : rise}
				>
					<AppText
						className="text-[13px] leading-[18px]"
						color="muted"
						variant="footnote"
					>
						{`${part.usual === null ? "" : COPY.steadinessScreen.usuallyCap(part.usual)}${part.trend ? ` · ${trendSay(part.trend, now)}` : ""}`}
					</AppText>
					<NoticedList className="pt-3" items={part.noticed} />
					{part.kindling ? <KindlingRow onPress={onKindling} /> : null}
				</Animated.View>
			) : null}
		</View>
	);
}
