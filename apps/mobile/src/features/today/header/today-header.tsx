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
import { useToday } from "../today-data";
import { useScrolledPast, useTodayFrame } from "../today-frame";
import { Greeting } from "./greeting";
import { StreakChip } from "./streak-chip";

/** The top row and greeting fade over the first 120 pt of scroll. */
const FADE_OVER = 120;
const LIFEBUOY = 20;
/**
 * Where the return pill sits under the greeting (board `.tpill`: 14 below, 36 tall). The
 * pill shows what coming back left waiting, which needs `followUps.getWaitingCard`
 * (B1); until it lands the slot stays empty, as the prototype's is with nothing
 * waiting. The Reflect card's margin gives the room back, so Today doesn't move.
 */
const PILL_SLOT = 14 + 36;

/** Eyebrow and the glass group (streak + lifebuoy), then the greeting. */
export function TodayHeader({
	flameClock,
}: {
	flameClock: SharedValue<number>;
}) {
	const danger = useTokenColor("danger");
	const { state, actions } = useToday();
	const { intro, reduced, scrollY, live } = useTodayFrame();
	// The chip's flame stops once the row has faded out under the band.
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
			<Greeting intro={intro} reduced={reduced} text={state.greeting} />
			<View style={{ height: PILL_SLOT }} />
		</Animated.View>
	);
}
