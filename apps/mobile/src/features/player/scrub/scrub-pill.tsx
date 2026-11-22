import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useDerivedValue,
} from "react-native-reanimated";
import { useTokenColor } from "@/lib/use-token-color";
import { fmt } from "../player-format";
import { WAVE } from "../player-metrics";
import { LiveText } from "./live-text";
import type { Playhead } from "./use-playhead";

const SLOT = 80;

export function ScrubPill({
	head,
	boxW,
	duration,
	above,
}: {
	head: Playhead;
	boxW: SharedValue<number>;
	duration: number;
	above: number;
}) {
	const shadow = useTokenColor("player-shadow");
	const text = useDerivedValue(() => fmt(head.scrubF.get() * duration));
	const style = useAnimatedStyle(() => {
		const w = boxW.get();
		const x = Math.max(
			WAVE.pillInset,
			Math.min(w - WAVE.pillInset, head.fingerX.get())
		);
		return {
			opacity: head.touch.get(),
			transform: [{ translateX: x - SLOT / 2 }],
		};
	});
	return (
		<Animated.View
			className="absolute left-0 items-center"
			pointerEvents="none"
			style={[{ top: -above, width: SLOT }, style]}
		>
			<View
				className="justify-center rounded-full bg-player-ink px-2.5"
				style={{
					boxShadow: `0 6px 16px -6px ${shadow}`,
					height: WAVE.pillH,
				}}
			>
				<LiveText
					className="font-semibold text-[13px] text-player-scrim tabular-nums"
					text={text}
				/>
			</View>
		</Animated.View>
	);
}
