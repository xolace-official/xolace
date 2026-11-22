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
const DIM = 0.55;
const INTRO_DELAY_MS = 1400;
const ICON_STYLE = { opacity: 0.5 } as const;

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
