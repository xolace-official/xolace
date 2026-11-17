import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useFade } from "@/features/vent/chrome/use-fade";
import { VENT_COPY } from "@/features/vent/copy";
import type { VentPhase } from "@/features/vent/vent-data";
import { useVentScreen } from "@/features/vent/vent-data";
import { useTokenColor } from "@/lib/use-token-color";

const XMARK = { android: "close", ios: "xmark" } as const;
const SHOWN: readonly VentPhase[] = [
	"intro",
	"idle",
	"rec",
	"heard",
	"ash",
	"gone",
];
/** v2: dimmed while it listens, so it's there but quiet. */
const DIM = 0.55;
/** v2: the intro brings it in with "I understand". */
const INTRO_DELAY_MS = 1400;
const ICON_STYLE = { opacity: 0.5 } as const;

/**
 * Production's close: a 36 pt circle at white 5%, 64 from the top and 24 from the right.
 * v2: on the intro too, and dim while recording, where closing drops the take.
 */
export function VentClose() {
	const { state, actions } = useVentScreen();
	const cream = useTokenColor("vent-cream");
	const shown = SHOWN.includes(state.phase);
	const fade = useFade(shown, {
		delayMs: state.phase === "intro" ? INTRO_DELAY_MS : 0,
		inMs: 400,
		outMs: 300,
		to: state.phase === "rec" ? DIM : 1,
	});

	return (
		<Animated.View
			className="absolute top-16 right-6 z-6"
			pointerEvents={shown ? "auto" : "none"}
			style={fade}
		>
			<PressScale
				accessibilityLabel={VENT_COPY.closeLabel}
				hitSlop={12}
				onPress={actions.close}
			>
				<View className="size-9 items-center justify-center rounded-full bg-white/5">
					<Icon
						color={cream}
						name={XMARK}
						size={15}
						style={ICON_STYLE}
						weight="semibold"
					/>
				</View>
			</PressScale>
		</Animated.View>
	);
}
