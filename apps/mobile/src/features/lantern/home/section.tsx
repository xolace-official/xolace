import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { fadeUp } from "@/design/entering";
import { LS, LT } from "@/features/lantern/lantern-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/**
 * A home section. Only on the arrival after the welcome does it rise in: Explore's 14 pt over
 * 450 ms, 120 + order × 80 ms. Reduce Motion: the fade.
 */
export function Section({
	order,
	enter,
	children,
}: {
	order: number;
	enter: boolean;
	children: ReactNode;
}) {
	const reduced = useEffectiveReducedMotion();
	const delay = LT.arriveBase + order * LT.arriveStep;
	return (
		<Animated.View
			entering={
				enter
					? fadeUp(delay, LT.arriveMs, LT.arriveRise, reduced, LT.arriveEase)
					: undefined
			}
		>
			{children}
		</Animated.View>
	);
}

/** Production's `SectionTitle`: the heading face at 22, 30 above and 12 below. */
export function SectionTitle({
	title,
	action,
	onAction,
}: {
	title: string;
	action?: string;
	onAction?: () => void;
}) {
	return (
		<View
			className="flex-row items-end justify-between"
			style={{
				paddingBottom: LS.sectionGap,
				paddingHorizontal: LS.gutter,
				paddingTop: LS.sectionTop,
			}}
		>
			<AppText
				accessibilityRole="header"
				className="text-[22px] leading-[26.4px] tracking-[-0.33px]"
				variant="headlineL"
			>
				{title}
			</AppText>
			{action ? (
				<Pressable accessibilityRole="button" hitSlop={8} onPress={onAction}>
					<AppText
						className="text-[15px] leading-[20px]"
						color="accent"
						variant="callout"
						weight="medium"
					>
						{action}
					</AppText>
				</Pressable>
			) : null}
		</View>
	);
}
