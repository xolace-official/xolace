import { View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { fadeUp } from "@/design/entering";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { LAYOUT } from "./layout";

const CHIP = { height: LAYOUT.write.chip };
/** Board `.pchip`: rises in over .3 s. */
const IN_MS = 300;
const RISE = 8;

/** The words you picked, as ember chips (board `.pchip`), under the question and in Your words. */
export function PickedChips({ words }: { words: readonly string[] }) {
	const reduced = useEffectiveReducedMotion();
	if (words.length === 0) {
		return null;
	}
	return (
		<View className="flex-row flex-wrap gap-1.5">
			{words.map((w) => (
				<Animated.View
					className="justify-center rounded-full bg-ember-wash px-2.5"
					entering={fadeUp(0, IN_MS, RISE, reduced)}
					key={w}
					style={CHIP}
				>
					<AppText
						className="text-[12.5px]"
						color="emberInk"
						maxFontSizeMultiplier={1.4}
						variant="caption"
						weight="semibold"
					>
						{w}
					</AppText>
				</Animated.View>
			))}
		</View>
	);
}
