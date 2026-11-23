import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { COPY } from "@/features/you/copy";
import {
	HalfGauge,
	LockedGauge,
} from "@/features/you/steadiness/detail/half-gauge";
import { rise } from "@/features/you/steadiness/detail/rise";
import { KindlingRow, NoticedList } from "@/features/you/steadiness/notes";
import type { PartView } from "@/features/you/steadiness/steadiness-model";
import { TrendChip } from "@/features/you/steadiness/trend-chip";
import { Surface } from "@/features/you/surface";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const S = COPY.steadinessScreen;
const FADE_MS = 150;

export function DetailCard({
	part,
	now,
	onKindling,
}: {
	part: PartView;
	now: Date;
	onKindling: () => void;
}) {
	const reduced = useEffectiveReducedMotion();
	const color = useTokenColor(part.tone === "muted" ? "subtle" : part.tone);
	const value = part.value ?? 0;
	return (
		<Animated.View entering={reduced ? FadeIn.duration(FADE_MS) : rise}>
			<Surface className="gap-4 overflow-hidden px-5 pb-5">
				<HalfGauge
					color={color}
					label={`${value} out of 100${part.usual === null ? "" : `, ${S.usually(part.usual)}`}`}
					usual={part.usual}
					value={value}
				/>
				<View className="flex-row items-center gap-3">
					<View className="flex-1 gap-0.5">
						<AppText
							className="text-[17px] leading-[22px]"
							variant="headline"
							weight="medium"
						>
							{part.name}
						</AppText>
						<AppText
							className="text-[13px] leading-[18px]"
							color="subtle"
							variant="footnote"
						>
							{part.usual === null
								? part.sub
								: `${part.sub} · ${S.usually(part.usual)}`}
						</AppText>
					</View>
					{part.trend ? <TrendChip now={now} trend={part.trend} /> : null}
				</View>
				<NoticedList items={part.noticed} />
				{part.kindling ? <KindlingRow onPress={onKindling} /> : null}
			</Surface>
		</Animated.View>
	);
}

export function LockedDetail({
	part,
	onUnlock,
}: {
	part: PartView;
	onUnlock: () => void;
}) {
	const reduced = useEffectiveReducedMotion();
	return (
		<Animated.View entering={reduced ? FadeIn.duration(FADE_MS) : rise}>
			<Surface className="gap-4 overflow-hidden px-5 pb-5">
				<LockedGauge />
				<View className="gap-0.5">
					<AppText
						className="text-[17px] leading-[22px]"
						variant="headline"
						weight="medium"
					>
						{part.name}
					</AppText>
					<AppText
						className="text-[13px] leading-[18px]"
						color="subtle"
						variant="footnote"
					>
						{part.sub}
					</AppText>
				</View>
				<AppText
					className="text-[14px] leading-[21px]"
					color="muted"
					variant="callout"
				>
					{part.peek}
				</AppText>
				<GlassButton
					accessibilityRole="button"
					className="h-11 items-center justify-center rounded-[22px]"
					fill="accent"
					haptic={playSoftPress}
					onPress={onUnlock}
				>
					<AppText
						className="text-[15px] text-accent-foreground leading-5"
						variant="callout"
						weight="semibold"
					>
						{S.peekGo}
					</AppText>
				</GlassButton>
			</Surface>
		</Animated.View>
	);
}
