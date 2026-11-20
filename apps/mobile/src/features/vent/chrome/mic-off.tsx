import { View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { useFade } from "@/features/vent/chrome/use-fade";
import { VENT_COPY } from "@/features/vent/copy";
import { useVentScreen } from "@/features/vent/vent-data";

const ABOVE_HINT = 26;

export function MicOff({ hintTop }: { hintTop: number }) {
	const { state, actions } = useVentScreen();
	const fade = useFade(state.micOff, { inMs: 400, outMs: 400 });

	return (
		<Animated.View
			accessibilityLiveRegion="polite"
			className="absolute inset-x-10 z-5 items-center"
			pointerEvents={state.micOff ? "auto" : "none"}
			style={[{ top: hintTop - ABOVE_HINT }, fade]}
		>
			<AppText
				center
				className="text-[15px] text-vent-cream/75 leading-[21px]"
				variant="body"
				weight="medium"
			>
				{VENT_COPY.micOff.title}
			</AppText>
			<AppText
				center
				className="mt-0.5 text-[13.5px] text-vent-cream/45 leading-[19px]"
				variant="body"
			>
				{VENT_COPY.micOff.body}
			</AppText>
			<PressScale className="mt-3.5" onPress={actions.openSettings}>
				<View className="h-9 justify-center rounded-full border border-vent-cream/25 bg-vent-cream/10 px-4">
					<AppText
						className="text-[14px] text-vent-cream leading-[19px]"
						variant="body"
						weight="medium"
					>
						{VENT_COPY.micOff.action}
					</AppText>
				</View>
			</PressScale>
		</Animated.View>
	);
}
