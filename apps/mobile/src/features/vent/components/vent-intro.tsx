import { Button } from "heroui-native";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";
import { ParticleField } from "./particles/particle-field";

const LINES = [
	"This is a space to say the unsaid.",
	"Your voice is never stored.",
	"It goes when you close.",
];

type Props = {
	onUnderstand: () => void;
};

/**
 * First-time intro: sparse, barely-visible particle drift behind three quiet
 * lines and a text-only "I understand" button. Shown once per device.
 */
export function VentIntro({ onUnderstand }: Props) {
	const handlePress = () => {
		playSoftPress();
		onUnderstand();
	};

	return (
		<View className="flex-1">
			<ParticleField stage="sparse" />
			<View className="flex-1 items-center justify-center px-10">
				<Animated.View
					className="gap-3"
					entering={FadeIn.duration(900).delay(300)}
				>
					{LINES.map((line) => (
						<AppText
							className="text-center text-[#F5F0E8]/70 text-base leading-7"
							key={line}
						>
							{line}
						</AppText>
					))}
				</Animated.View>
			</View>
			<Animated.View
				className="items-center pb-24"
				entering={FadeIn.duration(700).delay(1400)}
			>
				<Button
					accessibilityLabel="I understand"
					onPress={handlePress}
					size="md"
					variant="ghost"
				>
					<Button.Label className="text-[#F5F0E8]/60 text-base">
						I understand
					</Button.Label>
				</Button>
			</Animated.View>
		</View>
	);
}
