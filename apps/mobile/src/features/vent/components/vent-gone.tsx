import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Button } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	FadeIn,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/src/components/shared/app-text";

// 60% cream-white — more muted than the acknowledgement words (design spec).
const GONE_STYLE = { color: "#F5F0E899" };
// Quieter still — the cap notice is a footnote, not a second headline.
const CAP_STYLE = { color: "#F5F0E866" };
// Full cream — the crisis CTA must read as a button, not a statement.
const CRISIS_CREAM = "#F5F0E8";

const HEART_NAME = {
	android: "favorite",
	ios: "heart",
} as const;

type Props = {
	/** When true, stay on screen and surface the crisis resources link. */
	isCrisis: boolean;
	/** True when the daily cap is why no acknowledgement came back. */
	capReached: boolean;
	/** Called after "Gone." has fully faded (non-crisis path → auto-dismiss). */
	onDone: () => void;
};

/**
 * The period: "Gone." materializes where the words were, holds 2s, fades
 * over 1s, then auto-dismisses. In the crisis path it stays put and offers
 * the crisis resources screen instead of auto-dismissing.
 */
export function VentGone({ isCrisis, capReached, onDone }: Props) {
	const router = useRouter();
	const opacity = useSharedValue(0);

	useEffect(() => {
		if (isCrisis) {
			opacity.set(withTiming(1, { duration: 400 }));
			return;
		}
		// Hold longer when the cap notice is showing so it can actually be read.
		const holdMs = capReached ? 3600 : 2000;
		opacity.set(
			withSequence(
				withTiming(1, { duration: 400 }),
				withDelay(
					holdMs,
					withTiming(0, { duration: 1000 }, (finished) => {
						"worklet";
						if (finished) {
							scheduleOnRN(onDone);
						}
					})
				)
			)
		);
	}, [isCrisis, capReached, opacity, onDone]);

	const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

	return (
		<View className="absolute inset-0 items-center justify-center px-12">
			<Animated.View className="items-center gap-3" style={fadeStyle}>
				<AppText className="font-normal text-base" style={GONE_STYLE}>
					Gone.
				</AppText>
				{capReached && (
					<AppText className="text-center text-sm" style={CAP_STYLE}>
						You&apos;ve used today&apos;s voice replies. They return tomorrow.
					</AppText>
				)}
			</Animated.View>

			{isCrisis && (
				<Animated.View
					className="absolute bottom-28 items-center gap-4"
					entering={FadeIn.duration(700).delay(1200)}
				>
					<Button
						accessibilityLabel="Open crisis resources"
						className="rounded-full border border-[#F5F0E8]/30 bg-[#F5F0E8]/10 px-6"
						onPress={() => router.push("/(protected)/crisis-resources")}
						size="md"
						variant="ghost"
					>
						<SymbolView name={HEART_NAME} size={16} tintColor={CRISIS_CREAM} />
						<Button.Label className="text-[#F5F0E8] text-sm">
							Support is here if you want it
						</Button.Label>
					</Button>
					<Button
						accessibilityLabel="Close"
						onPress={onDone}
						size="sm"
						variant="ghost"
					>
						<Button.Label className="text-[#F5F0E8]/40 text-sm">
							Close
						</Button.Label>
					</Button>
				</Animated.View>
			)}
		</View>
	);
}
