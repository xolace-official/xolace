import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { BODY_MAX_SCALE } from "@/design/type";
import type { KeyboardLift } from "@/lib/keyboard/use-keyboard-lift";
import { LAYOUT } from "../layout";
import { TEXTURE_OUT } from "../motion";
import { useReflectDraw } from "../reflect-draw";
import { bandFits } from "./band-room";
import { FIELD_TEXT } from "./field-type";
import { TexturePicker } from "./texture-picker";

const BAND_ABOVE_BAR = LAYOUT.texture.bottom - 34;
const DOWN = 0.01;

type Props = {
	lift: KeyboardLift;
	boxTop: SharedValue<number>;
	away: boolean;
	blur: () => void;
};

export function TextureBand({ lift, boxTop, away, blur }: Props) {
	const { reduced } = useReflectDraw();
	const { height: screenH, fontScale } = useWindowDimensions();
	const line = FIELD_TEXT.lineHeight * Math.min(fontScale, BODY_MAX_SCALE);
	const band = useSharedValue(away ? 0 : 1);
	useEffect(() => {
		band.set(
			withTiming(away ? 0 : 1, { duration: TEXTURE_OUT.ms, ...PLAY_AS_CHOSEN })
		);
	}, [away, band]);
	const bandH = useSharedValue(0);

	const picking = useSharedValue(false);
	useAnimatedReaction(
		() => lift.progress.get() < DOWN,
		(down) => {
			if (down) {
				picking.set(false);
			}
		}
	);
	const pick = () => {
		if (lift.progress.get() < DOWN) {
			return;
		}
		picking.set(true);
		blur();
	};

	const roomy = useDerivedValue(() => {
		const fits = bandFits({
			bandAboveBar: BAND_ABOVE_BAR,
			bandH: bandH.get(),
			boxTop: boxTop.get(),
			liftBottom: lift.bottom.get(),
			line,
			screenH,
		});
		return lift.progress.get() < DOWN || picking.get() || fits ? 1 : 0;
	});
	const style = useAnimatedStyle(() => {
		const drop = reduced ? 0 : TEXTURE_OUT.drop * (1 - band.get());
		return {
			opacity: band.get() * roomy.get(),
			transform: [{ translateY: lift.rest - lift.bottom.get() + drop }],
		};
	});

	return (
		<Animated.View
			className="absolute"
			onLayout={(e) => bandH.set(e.nativeEvent.layout.height)}
			pointerEvents={away ? "none" : "box-none"}
			style={[
				{
					bottom: lift.rest + BAND_ABOVE_BAR,
					left: LAYOUT.texture.side,
					right: LAYOUT.texture.side,
				},
				style,
			]}
		>
			<TexturePicker onUse={pick} />
		</Animated.View>
	);
}
