import { useEffect, useEffectEvent } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import {
	FADE_IN,
	FADE_OUT,
	GlassSurface,
} from "@/components/shared/glass-surface";
import { PressScale } from "@/components/shared/press-scale";
import { EaseView, NONE } from "@/design/ease";
import { MOMENTS_COPY } from "@/features/you/moments/copy";
import { tap } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const L = MOMENTS_COPY.list;
const EDGE = 12;
const LIFT = 4;
const RISE = 12;
const RISE_MS = 260;

const styles = StyleSheet.create({
	bar: { left: 12, position: "absolute", right: 12 },
});

export function WindowDoor({
	days,
	onSeeAll,
	onSeen,
}: {
	days: number;
	onSeeAll: () => void;
	onSeen: () => void;
}) {
	const { bottom } = useSafeAreaInsets();
	const reduced = useEffectiveReducedMotion();
	const seen = useEffectEvent(onSeen);
	useEffect(() => {
		seen();
	}, []);
	return (
		// Glass stops rendering under an animated opacity, so the fade runs only where there is
		// no glass. Ease ignores Reduce Motion: reduced, it's simply there.
		<EaseView
			animate={{ translateY: 0, ...FADE_OUT }}
			initialAnimate={
				reduced
					? { translateY: 0, ...FADE_OUT }
					: { translateY: RISE, ...FADE_IN }
			}
			style={[styles.bar, { bottom: Math.max(bottom, EDGE) + LIFT }]}
			transition={reduced ? NONE : { duration: RISE_MS, type: "timing" }}
		>
			<GlassSurface
				className="flex-row items-center gap-3 py-3 pr-3 pl-4.5"
				radius={26}
			>
				<View className="flex-1 gap-0.5">
					<AppText
						className="text-[14.5px]"
						variant="callout"
						weight="semibold"
					>
						{L.limitTitle(days)}
					</AppText>
					<AppText color="muted" variant="footnote">
						{L.limitSub}
					</AppText>
				</View>
				<PressScale
					accessibilityRole="button"
					className="h-10 items-center justify-center rounded-[20px] bg-foreground px-4"
					haptic={tap}
					onPress={onSeeAll}
				>
					<AppText
						className="text-[14.5px]"
						color="background"
						variant="callout"
						weight="semibold"
					>
						{L.seeAll}
					</AppText>
				</PressScale>
			</GlassSurface>
		</EaseView>
	);
}
