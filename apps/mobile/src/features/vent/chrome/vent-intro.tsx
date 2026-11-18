import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { VENT_COPY } from "@/features/vent/copy";
import { useVentScreen } from "@/features/vent/vent-data";

const NEVER = PLAY_AS_CHOSEN.reduceMotion;
const LINES_IN = FadeIn.duration(900).delay(300).reduceMotion(NEVER);
const UNDERSTAND_IN = FadeIn.duration(700).delay(1400).reduceMotion(NEVER);
const OUT = FadeOut.duration(500).reduceMotion(NEVER);

/**
 * Production's first-time intro, shown once over the sparse drift (the field's `sparse`): three
 * quiet lines and a text-only "I understand".
 */
export function VentIntro() {
	const { state, actions } = useVentScreen();
	if (state.phase !== "intro") {
		return null;
	}
	return (
		<Animated.View className="absolute inset-0 z-4" exiting={OUT}>
			<Animated.View
				className="absolute inset-x-10 top-0 bottom-30 justify-center gap-3"
				entering={LINES_IN}
			>
				{VENT_COPY.intro.map((line) => (
					<AppText
						center
						className="text-[16px] text-vent-cream/70 leading-[28px]"
						key={line}
						variant="body"
					>
						{line}
					</AppText>
				))}
			</Animated.View>
			<Animated.View
				className="absolute inset-x-0 bottom-24 items-center"
				entering={UNDERSTAND_IN}
			>
				<Pressable
					accessibilityRole="button"
					hitSlop={8}
					onPress={actions.understand}
				>
					<View className="h-10 justify-center px-4.5">
						<AppText
							className="text-[16px] text-vent-cream/60 leading-[21px]"
							variant="body"
						>
							{VENT_COPY.understand}
						</AppText>
					</View>
				</Pressable>
			</Animated.View>
		</Animated.View>
	);
}
