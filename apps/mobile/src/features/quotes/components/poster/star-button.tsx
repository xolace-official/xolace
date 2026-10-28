import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

const STAR_ICON = { android: "star_border", ios: "star" } as const;
const STAR_ON_ICON = { android: "star", ios: "star.fill" } as const;
const SPRING = { damping: 18, mass: 0.9, stiffness: 160 };

/** Keep this quote; it fills the archive. Same plate circle as the back button opposite. */
export function StarButton({
	saved,
	onToggle,
	locked = false,
}: {
	saved: boolean;
	onToggle: (next: boolean) => void;
	/** Xolace+ gate (#317): the tap opens the paywall instead of saving. */
	locked?: boolean;
}) {
	const ink = useCSSVariable("--color-poster-ink") as string;

	const pop = useSharedValue(1);
	const isFirst = useSharedValue(true);
	useEffect(() => {
		if (isFirst.get()) {
			isFirst.set(false);
			return;
		}
		pop.set(
			withSequence(withTiming(1.14, { duration: 130 }), withSpring(1, SPRING))
		);
	}, [saved, pop, isFirst]);
	const popStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pop.get() }],
	}));

	return (
		<Animated.View style={popStyle}>
			<PressableFeedback
				accessibilityLabel={
					locked
						? "Save quote; Xolace+"
						: saved
							? "Remove from saved"
							: "Save quote"
				}
				accessibilityRole="button"
				accessibilityState={{ selected: saved }}
				hitSlop={12}
				onPress={() => {
					Presets.chirp();
					onToggle(!saved);
				}}
			>
				<View className="h-11 w-11 items-center justify-center rounded-full bg-poster-plate">
					<SymbolView
						name={saved ? STAR_ON_ICON : STAR_ICON}
						size={18}
						tintColor={ink}
					/>
				</View>
			</PressableFeedback>
		</Animated.View>
	);
}
