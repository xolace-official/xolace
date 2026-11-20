import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GlassGroup } from "@/components/shared/glass-group";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { RekindlePill } from "../rekindle/rekindle-pill";
import { useToday } from "../today-data";
import { useScrolledPast, useTodayFrame } from "../today-frame";
import { Greeting } from "./greeting";
import { StreakChip } from "./streak-chip";

const FADE_OVER = 120;
const LIFEBUOY = 20;
export const PILL_SLOT = 14 + 36;

export function TodayHeader({
	flameClock,
	pill,
}: {
	flameClock: SharedValue<number>;
	pill?: (fallback: ReactNode) => ReactNode;
}) {
	const danger = useTokenColor("danger");
	const { state, actions } = useToday();
	const { intro, reduced, scrollY, live, waiting } = useTodayFrame();
	const faded = useScrolledPast(scrollY, FADE_OVER);
	const fade = useAnimatedStyle(() => ({
		opacity: Math.max(0, 1 - scrollY.get() / FADE_OVER),
	}));

	return (
		<Animated.View style={fade}>
			<View className="min-h-11.5 flex-row items-center justify-between gap-3 px-1">
				{/* As tall as the row, so VoiceOver (top, then left) reads it before the chip. */}
				<View
					accessibilityLabel={state.eyebrow}
					accessibilityRole="text"
					accessible
					className="flex-1 justify-center self-stretch"
				>
					<AppText
						className="tracking-[0.13px]"
						color="muted"
						variant="footnote"
						weight="semibold"
					>
						{state.eyebrow}
					</AppText>
				</View>
				<GlassGroup>
					<StreakChip
						clock={flameClock}
						reduced={reduced}
						running={live && !faded}
					/>
					<PressScale
						accessibilityLabel={COPY.help}
						accessibilityRole="button"
						className="size-9.5 items-center justify-center"
						onPress={actions.openHelp}
					>
						<Icon
							color={danger}
							name={{ android: "support", ios: "lifepreserver" }}
							size={LIFEBUOY}
						/>
					</PressScale>
				</GlassGroup>
			</View>
			<Greeting
				intro={intro}
				reduced={reduced}
				text={state.greeting}
				waiting={waiting}
			/>
			{pill ? (
				pill(<RekindlePill height={PILL_SLOT} />)
			) : (
				<RekindlePill height={PILL_SLOT} />
			)}
		</Animated.View>
	);
}
