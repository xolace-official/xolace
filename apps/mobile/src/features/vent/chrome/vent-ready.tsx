import { useWindowDimensions } from "react-native";
import Animated, { Easing } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { MicOff } from "@/features/vent/chrome/mic-off";
import { useFade } from "@/features/vent/chrome/use-fade";
import { VentMicButton } from "@/features/vent/chrome/vent-mic-button";
import { VENT_COPY } from "@/features/vent/copy";
import { useVentScreen } from "@/features/vent/vent-data";
import { underMic } from "@/features/vent/vent-model";

const HINT_AT = 0.68;
const MIC_BOTTOM = 100;
const MIC = 60;
const LINE_GAP = 14;
const EASE_OUT_QUAD = Easing.out(Easing.quad);
const LINE_TEXT = {
	capBefore: VENT_COPY.capBefore,
	recording: VENT_COPY.underRecording,
	soon: VENT_COPY.underSoon,
} as const;

export function VentReady() {
	const { state, actions } = useVentScreen();
	const { height } = useWindowDimensions();
	const hintTop = Math.round(height * HINT_AT);
	const { phase, micOff, soon } = state;
	const idle = phase === "idle";
	const rec = phase === "rec";
	const line = underMic(
		idle ? "idle" : rec ? "rec" : "other",
		soon,
		state.capBefore
	);

	const hint = useFade(idle && !micOff, {
		delayMs: 3200,
		easing: EASE_OUT_QUAD,
		inMs: 600,
		outMs: micOff ? 200 : 300,
	});
	const mic = useFade(idle || rec, {
		delayMs: rec ? 0 : 600,
		inMs: 500,
		outMs: 250,
	});
	const under = useFade(line !== null, {
		delayMs: rec ? 800 : 1200,
		inMs: 400,
		outMs: 400,
	});
	const text = LINE_TEXT[line?.text ?? (soon ? "soon" : "recording")];

	return (
		<>
			<Animated.View
				className="absolute inset-x-0 z-3"
				pointerEvents="none"
				style={[{ top: hintTop }, hint]}
			>
				<AppText
					center
					className="text-[14px] text-vent-cream/40 leading-[20px]"
					variant="body"
				>
					{VENT_COPY.hint}
				</AppText>
			</Animated.View>

			<MicOff hintTop={hintTop} />

			<Animated.View
				className="absolute inset-x-0 z-5 items-center"
				pointerEvents={idle || rec ? "box-none" : "none"}
				style={[{ gap: LINE_GAP, top: height - MIC_BOTTOM - MIC }, mic]}
			>
				<VentMicButton
					onPress={actions.tapMic}
					recording={rec}
					reduced={state.reduced}
				/>
				<Animated.View style={under}>
					<AppText
						className={
							soon && !idle
								? "text-[13px] text-vent-amber/75 leading-[18px]"
								: "text-[13px] text-vent-cream/40 leading-[18px]"
						}
						numberOfLines={1}
						variant="body"
					>
						{text}
					</AppText>
				</Animated.View>
			</Animated.View>
		</>
	);
}
