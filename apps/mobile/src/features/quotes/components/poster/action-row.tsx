import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/src/components/shared/app-text";

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
}: {
	resonates: boolean;
	isSharingLoading?: boolean;
	onShare: () => void;
	onReact: (next: "resonates" | null) => void;
}) {
	const [ink, inkDeep, white, shadow] = useCSSVariable([
		"--color-poster-ink",
		"--color-poster-ink-deep",
		"--color-poster-plate",
		"--color-poster-shadow",
	]) as string[];

	// the pill answers the tap itself; the full-screen burst is the screen's
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

	const shadowStyle = { shadowColor: shadow };

	return (
		<View className="mt-4.5 flex-row gap-3">
			<PressableFeedback
				accessibilityLabel="Share"
				accessibilityRole="button"
				isDisabled={!!isSharingLoading}
				onPress={onShare}
				style={styles.share}
			>
				<View
					className="h-13 flex-row items-center justify-center gap-2.5 rounded-[14px] bg-poster-plate"
					style={[styles.pill, shadowStyle]}
				>
					<AppText className="font-semibold text-[15px] text-poster-ink">
						Share
					</AppText>
					<SymbolView
						name={isSharingLoading ? SHARING_ICON : SHARE_ICON}
						size={16}
						tintColor={ink}
					/>
				</View>
			</PressableFeedback>

			<Animated.View style={[styles.resonate, popStyle]}>
				<PressableFeedback
					accessibilityLabel="Resonate"
					accessibilityRole="button"
					accessibilityState={{ selected: resonates }}
					onPress={() => {
						Presets.chirp();
						onReact(resonates ? null : "resonates");
					}}
				>
					<View
						className="h-13 flex-row items-center justify-center gap-2.5 rounded-[14px] bg-poster-resonate"
						style={[styles.pill, shadowStyle]}
					>
						<AppText
							className="font-semibold text-[15px]"
							style={{ color: resonates ? white : inkDeep }}
						>
							Resonate
						</AppText>
						<SymbolView
							name={resonates ? HEART_ON_ICON : HEART_ICON}
							size={18}
							tintColor={resonates ? white : inkDeep}
						/>
					</View>
				</PressableFeedback>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	pill: {
		elevation: 3,
		shadowOffset: { height: 6, width: 0 },
		shadowOpacity: 0.1,
		shadowRadius: 16,
	},
	/* the design gives Resonate the wider half of the row */
	resonate: { flex: 1.15 },
	share: { flex: 1 },
});
