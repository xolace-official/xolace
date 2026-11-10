import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import type { ReactNode } from "react";
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
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";

const SHARE_ICON = { android: "share", ios: "square.and.arrow.up" } as const;
const SHARING_ICON = { android: "refresh", ios: "arrow.2.circlepath" } as const;
const HEART_ICON = { android: "favorite_border", ios: "heart" } as const;
const HEART_ON_ICON = { android: "favorite", ios: "heart.fill" } as const;
const SPRING = { damping: 18, mass: 0.9, stiffness: 160 };

export function ActionRow({
	resonates,
	isSharingLoading,
	onShare,
	onReact,
	reply,
}: {
	resonates: boolean;
	isSharingLoading?: boolean;
	onShare: () => void;
	onReact: (next: "resonates" | null) => void;
	reply: ReactNode;
}) {
	const [ink, white] = useCSSVariable([
		"--color-poster-ink",
		"--color-poster-plate",
	]) as string[];

	const pop = useSharedValue(1);
	const isFirst = useSharedValue(true);
	useEffect(() => {
		if (isFirst.get()) {
			isFirst.set(false);
			return;
		}
		pop.set(
			withSequence(withTiming(1.06, { duration: 130 }), withSpring(1, SPRING))
		);
	}, [resonates, pop, isFirst]);
	const popStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pop.get() }],
	}));

	return (
		<View className="mt-2 flex-row items-center gap-3">
			<Animated.View className="flex-1" style={popStyle}>
				<PressableFeedback
					accessibilityLabel="Resonate"
					accessibilityRole="button"
					accessibilityState={{ selected: resonates }}
					onPress={() => {
						Presets.chirp();
						onReact(resonates ? null : "resonates");
					}}
				>
					<GlassSurface
						className="h-13 flex-row items-center justify-center gap-2.5 px-5"
						interactive
						radius={26}
						tint={resonates ? "accent" : undefined}
					>
						<AppText
							className="font-semibold text-[15px] text-poster-ink"
							style={{ color: resonates ? white : ink }}
						>
							Resonate
						</AppText>
						<SymbolView
							name={resonates ? HEART_ON_ICON : HEART_ICON}
							size={18}
							tintColor={resonates ? white : ink}
						/>
					</GlassSurface>
				</PressableFeedback>
			</Animated.View>

			{reply}

			<PressableFeedback
				accessibilityLabel="Share"
				accessibilityRole="button"
				isDisabled={!!isSharingLoading}
				onPress={onShare}
			>
				<GlassSurface
					className="h-13 w-13 items-center justify-center"
					interactive
					radius={26}
				>
					<SymbolView
						name={isSharingLoading ? SHARING_ICON : SHARE_ICON}
						size={19}
						tintColor={ink}
					/>
				</GlassSurface>
			</PressableFeedback>
		</View>
	);
}
