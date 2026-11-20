import { useState } from "react";
import { View } from "react-native";
import Animated, {
	FadeIn,
	LayoutAnimationConfig,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";
import { LETTERS } from "../copy";
import { LETTER_MOTION } from "../letter-motion";
import type { ReceivedLetter } from "../letters-model";
import { ReceivedRow } from "./received-row";

const MS = LETTER_MOTION.starters.fadeMs;
const CLOSED_TURN = -90;

export function HiddenGroup({
	letters,
	startOpen,
}: {
	letters: readonly ReceivedLetter[];
	startOpen: boolean;
}) {
	const [open, setOpen] = useState(startOpen);
	const muted = useTokenColor("muted");
	const reduced = useEffectiveReducedMotion();
	const turn = useSharedValue(open ? 0 : CLOSED_TURN);
	const toggle = () => {
		const next = !open;
		setOpen(next);
		turn.set(
			withTiming(next ? 0 : CLOSED_TURN, {
				duration: reduced ? 0 : MS,
				...PLAY_AS_CHOSEN,
			})
		);
	};
	const chevron = useAnimatedStyle(() => ({
		transform: [{ rotate: `${turn.get()}deg` }],
	}));
	if (letters.length === 0) {
		return null;
	}
	return (
		<View>
			<PressScale
				accessibilityLabel={LETTERS.hub.hiddenA11y(letters.length)}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				className="mx-4 min-h-11 flex-row items-center gap-1.5 border-separator border-b px-4 py-2.5"
				onPress={toggle}
			>
				<AppText
					className="text-[14.5px]"
					color="muted"
					variant="subhead"
					weight="semibold"
				>
					{LETTERS.hub.hidden(letters.length)}
				</AppText>
				<Animated.View style={chevron}>
					<Icon
						color={muted}
						name={{ android: "expand_more", ios: "chevron.down" }}
						size={11}
					/>
				</Animated.View>
			</PressScale>
			<LayoutAnimationConfig skipEntering>
				{open
					? letters.map((l) => (
							<Animated.View
								entering={FadeIn.duration(
									reduced ? LETTER_MOTION.reducedMs : MS
								).reduceMotion(PLAY_AS_CHOSEN.reduceMotion)}
								key={l.id}
							>
								<ReceivedRow letter={l} />
							</Animated.View>
						))
					: null}
			</LayoutAnimationConfig>
		</View>
	);
}
