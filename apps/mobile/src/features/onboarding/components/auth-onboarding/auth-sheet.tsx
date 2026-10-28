/**
 * The sign-in half of the screen, revealed as the deck lifts off it.
 *
 */

import { SymbolView } from "expo-symbols";
import { Button, PressableFeedback, Spinner } from "heroui-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
	Extrapolation,
	FadeIn,
	interpolate,
	LinearTransition,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import { AppleIcon } from "@/features/auth/components/apple-icon";
import { GoogleIcon } from "@/features/auth/components/google-icon";
import { LegalBottomSheet } from "@/features/auth/components/legal-bottom-sheet";
import {
	type LegalDocument,
	PRIVACY_POLICY,
	TERMS_OF_SERVICE,
} from "@/features/auth/components/legal-content";
import { useProviderSignIn } from "@/features/auth/use-provider-sign-in";
import { playSoftPress } from "@/lib/haptics";
import { useDeckColor } from "./deck-color";

const SPINNER_ENTERING = FadeIn.delay(50);
const BUTTON_LAYOUT = LinearTransition.springify();
const CHEVRON_ICON = {
	android: "keyboard_arrow_down",
	ios: "chevron.down",
	web: "keyboard_arrow_down",
} as const;
const SEAT_ICON = { android: "person", ios: "person", web: "person" } as const;
const FLAME_ICON = {
	android: "local_fire_department",
	ios: "flame",
	web: "local_fire_department",
} as const;
const BUTTON_CLASS =
	"flex-row h-12 items-center justify-center gap-3 rounded-full border border-border bg-surface-secondary";
// Sign in with Apple HIG: solid light fill (dark deck), dark logo + label.
const APPLE_BUTTON_CLASS =
	"flex-row h-12 items-center justify-center gap-3 rounded-full bg-foreground";

export const AuthSheetBlock = ({
	progress,
	onCollapse,
}: {
	progress: SharedValue<number>;
	onCollapse: () => void;
}) => {
	const muted = useDeckColor("muted");
	const foreground = useDeckColor("foreground");
	const background = useDeckColor("background");
	const [activeDocument, setActiveDocument] = useState<LegalDocument | null>(
		null
	);
	const { loadingProvider, signInWithApple, signInWithGoogle } =
		useProviderSignIn();

	const rStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			progress.get(),
			[0.1, 0.8],
			[0, 1],
			Extrapolation.CLAMP
		),
		pointerEvents: progress.get() > 0.6 ? "auto" : "none",
	}));

	return (
		<Animated.View style={rStyle}>
			<PressableFeedback
				className="mb-5 self-center p-1"
				hitSlop={12}
				onPress={onCollapse}
			>
				<SymbolView name={CHEVRON_ICON} size={16} tintColor={muted} />
			</PressableFeedback>

			<AppText className="mb-7 text-center font-poppins-medium text-[24px] text-foreground/90">
				The fire&apos;s already lit.
			</AppText>

			<View className="mb-4 gap-3 px-6">
				<Button
					className={`${BUTTON_CLASS}${loadingProvider === "google" ? "self-center" : ""}`}
					isDisabled={loadingProvider !== null}
					isIconOnly={loadingProvider === "google"}
					layout={BUTTON_LAYOUT}
					onPress={signInWithGoogle}
					size="lg"
					variant="ghost"
				>
					{loadingProvider === "google" ? (
						<Spinner color={foreground} entering={SPINNER_ENTERING} />
					) : (
						<>
							<GoogleIcon size={17} />
							<Button.Label className="text-[15px] text-foreground/90">
								Continue with Google
							</Button.Label>
						</>
					)}
				</Button>
				<Button
					className={`${APPLE_BUTTON_CLASS}${loadingProvider === "apple" ? "self-center" : ""}`}
					isDisabled={loadingProvider !== null}
					isIconOnly={loadingProvider === "apple"}
					layout={BUTTON_LAYOUT}
					onPress={signInWithApple}
					size="lg"
					variant="ghost"
				>
					{loadingProvider === "apple" ? (
						<Spinner color={background} entering={SPINNER_ENTERING} />
					) : (
						<>
							<AppleIcon color={background} size={17} />
							<Button.Label className="text-[15px] text-background">
								Continue with Apple
							</Button.Label>
						</>
					)}
				</Button>
			</View>

			<View className="flex-row justify-center gap-1">
				<Pressable
					accessibilityRole="link"
					hitSlop={12}
					onPress={() => setActiveDocument(TERMS_OF_SERVICE)}
				>
					<AppText className="text-[11px] text-foreground/40 underline">
						Terms of Service
					</AppText>
				</Pressable>
				<AppText className="text-[11px] text-foreground/40"> · </AppText>
				<Pressable
					accessibilityRole="link"
					hitSlop={12}
					onPress={() => setActiveDocument(PRIVACY_POLICY)}
				>
					<AppText className="text-[11px] text-foreground/40 underline">
						Privacy Policy
					</AppText>
				</Pressable>
			</View>

			<LegalBottomSheet
				document={activeDocument}
				onClose={() => setActiveDocument(null)}
			/>
		</Animated.View>
	);
};

/**
 * two-row morph. Row one exits upward, row two enters from below,
 * both driven off the same expansion progress.
 */
export const MorphingSeatButton = ({
	progress,
	onExpand,
	onCollapse,
}: {
	progress: SharedValue<number>;
	onExpand: () => void;
	onCollapse: () => void;
}) => {
	const ember = useDeckColor("ember");

	const rTopRow = useAnimatedStyle(() => ({
		opacity: interpolate(progress.get(), [0, 0.7], [1, 0], Extrapolation.CLAMP),
		transform: [
			{
				translateY: interpolate(
					progress.get(),
					[0, 1],
					[0, -42],
					Extrapolation.CLAMP
				),
			},
		],
	}));

	const rBottomRow = useAnimatedStyle(() => ({
		opacity: interpolate(progress.get(), [0.3, 1], [0, 1], Extrapolation.CLAMP),
		transform: [
			{
				translateY: interpolate(
					progress.get(),
					[0, 1],
					[42, 0],
					Extrapolation.CLAMP
				),
			},
		],
	}));

	const handlePress = () => {
		playSoftPress();
		if (progress.get() > 0.5) {
			onCollapse();
		} else {
			onExpand();
		}
	};

	return (
		<PressableFeedback
			className="mx-6 mt-4 h-12 items-center justify-center overflow-hidden rounded-full border border-ember/25 bg-ember/10"
			onPress={handlePress}
			style={styles.continuousCurve}
		>
			<Animated.View className="flex-row items-center gap-2" style={rTopRow}>
				<SymbolView name={SEAT_ICON} size={15} tintColor={ember} />
				<AppText className="text-[15px] text-ember">Pull up a seat</AppText>
			</Animated.View>
			<Animated.View
				className="-mt-5 flex-row items-center gap-2"
				style={rBottomRow}
			>
				<SymbolView name={FLAME_ICON} size={15} tintColor={ember} />
				<AppText className="text-[15px] text-ember">Back to the fire</AppText>
			</Animated.View>
		</PressableFeedback>
	);
};

const styles = StyleSheet.create({
	continuousCurve: { borderCurve: "continuous" },
});
