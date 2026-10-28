import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { Pressable, StyleSheet } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";

// Gentle overshoot so it "lands" — a small reward for having reached out.
const EASING: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
const ENTER = { duration: 360, easing: EASING, type: "timing" as const };
const FROM = { opacity: 0, scale: 0.85 };
const TO = { opacity: 1, scale: 1 };

type Props = {
	onPress: () => void;
};

/**
 * Liquid-glass "Done" pill. Appears in the draft nav only after a share has
 * actually completed — a calm, positive way out, distinct from the "Not right
 * now" dismissal below.
 */
export function BridgeDoneButton({ onPress }: Props) {
	const foreground = useThemeColor("foreground") as string;
	const glass = isLiquidGlassAvailable();
	const body = (
		<>
			<SymbolView
				name={{ android: "check", ios: "checkmark", web: "check" }}
				size={14}
				tintColor={foreground}
			/>
			<AppText className="font-medium text-foreground text-sm">Done</AppText>
		</>
	);

	// Glass path: the label sits inside the glass so every touch on the pill
	// reaches it (its press swell), and nothing clips the swell.
	return (
		<EaseView animate={TO} initialAnimate={FROM} transition={ENTER}>
			<Pressable
				accessibilityHint="Finish and return home"
				accessibilityLabel="Done"
				accessibilityRole="button"
				className={
					glass
						? undefined
						: "h-10 flex-row items-center gap-1.5 border-foreground/16 px-4"
				}
				hitSlop={8}
				onPress={onPress}
				style={glass ? undefined : styles.fallback}
			>
				{glass ? (
					<GlassView
						glassEffectStyle="regular"
						isInteractive
						style={styles.glass}
					>
						{body}
					</GlassView>
				) : (
					body
				)}
			</Pressable>
		</EaseView>
	);
}

const styles = StyleSheet.create({
	fallback: {
		borderCurve: "continuous",
		borderRadius: 20,
		borderWidth: 0.5,
		overflow: "hidden",
	},
	glass: {
		alignItems: "center",
		borderCurve: "continuous",
		borderRadius: 20,
		flexDirection: "row",
		gap: 6,
		height: 40,
		overflow: "visible",
		paddingHorizontal: 16,
	},
});
