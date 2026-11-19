import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { BlurView } from "@/components/shared/styled";
import { cn } from "@/lib/cn";
import { QuoteIcon } from "../chrome/quote-icons";
import { type InkPalette, useQuoteInk } from "../chrome/quote-ink";
import { EASE, T, useQuoteMotion } from "../motion/quote-motion";

const EDGE = 8;
const RADIUS = 42;
const KEYBOARD_GAP = 12;
/** The sheet's 500 ms is the first 5/6 of the shared 600 ms clock. */
const SHEET_SHARE = T.stage / T.sheet;
const SHEET_BLUR = 30;
/** Before its first layout, the sheet starts this far down. */
const FIRST_HEIGHT = 600;
const OVERSHOOT = 1.1;

type Props = {
	ink: InkPalette;
	title: string;
	label: string;
	closeLabel: string;
	closeIcon?: "close" | "check";
	onClose: () => void;
	children: ReactNode;
};

/**
 * The board's `.sh`: 8 pt from the sides and the bottom, radius 42, the ink's material, a grabber
 * and a header. Rises with the shared sheet clock; with Reduce Motion it fades. Over the keyboard
 * it sits 12 pt above it. Modal for VoiceOver.
 */
export function QuoteSheet({
	ink,
	title,
	label,
	closeLabel,
	closeIcon = "close",
	onClose,
	children,
}: Props) {
	const m = useQuoteMotion();
	const { drop } = useQuoteInk();
	const height = useSharedValue(FIRST_HEIGHT);
	const { height: kb } = useReanimatedKeyboardAnimation();
	const style = useAnimatedStyle(() => {
		const t = EASE.sheet(Math.min(1, m.sheet.get() * SHEET_SHARE));
		const lift = Math.max(EDGE, -kb.get() + KEYBOARD_GAP) - EDGE;
		if (m.reduced) {
			return { opacity: t, transform: [{ translateY: -lift }] };
		}
		return {
			opacity: 1,
			transform: [{ translateY: (1 - t) * height.get() * OVERSHOOT - lift }],
		};
	});

	return (
		<Animated.View
			accessibilityLabel={label}
			accessibilityViewIsModal
			className="absolute overflow-hidden border-continuous"
			onLayout={(e) => height.set(e.nativeEvent.layout.height + EDGE)}
			style={[
				{
					borderRadius: RADIUS,
					bottom: EDGE,
					left: EDGE,
					right: EDGE,
					shadowColor: drop,
					shadowOffset: { height: -12, width: 0 },
					shadowOpacity: 0.22,
					shadowRadius: 20,
				},
				style,
			]}
		>
			<BlurView
				className="absolute inset-0"
				intensity={SHEET_BLUR}
				tint="default"
			/>
			<View
				className="absolute inset-0 border-[0.5px]"
				style={{
					backgroundColor: ink.sheet,
					borderColor: ink.line,
					borderRadius: RADIUS,
				}}
			/>
			<View className="gap-3.5 px-5 pt-2.5 pb-6">
				<Pressable
					accessibilityElementsHidden
					className="self-center"
					hitSlop={12}
					importantForAccessibility="no"
					onPress={onClose}
				>
					<View
						className="h-[5px] w-9 rounded-[3px] opacity-22"
						style={{ backgroundColor: ink.sheetText }}
					/>
				</Pressable>
				<View className="flex-row items-center gap-2.5">
					<AppText
						accessibilityRole="header"
						className="flex-1 text-[19px] tracking-[-0.19px]"
						style={{ color: ink.sheetText }}
						variant="headline"
						weight="semibold"
					>
						{title}
					</AppText>
					<PressScale
						accessibilityLabel={closeLabel}
						accessibilityRole="button"
						hitSlop={6}
						onPress={onClose}
					>
						<View
							className="size-9 items-center justify-center rounded-full"
							style={{ backgroundColor: ink.fill }}
						>
							<QuoteIcon
								color={ink.sheetText}
								name={closeIcon}
								size={closeIcon === "check" ? 15 : 14}
							/>
						</View>
					</PressScale>
				</View>
				{children}
			</View>
		</Animated.View>
	);
}
