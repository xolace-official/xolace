import { Easing, FadeInDown } from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";

const RISE_MS = 240;
const RISE_PT = 6;

export const rise = FadeInDown.duration(RISE_MS)
	.easing(Easing.bezier(0.23, 1, 0.32, 1).factory())
	.reduceMotion(PLAY_AS_CHOSEN.reduceMotion)
	.withInitialValues({ opacity: 0, transform: [{ translateY: RISE_PT }] });
