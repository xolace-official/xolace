import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PressableFeedback, Surface } from "heroui-native";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";

// TODO(asset): placeholder until the dedicated quotes illustration lands. The
// source is a 1200×1000 2×2 grid; the bottom-left figure is zoomed and offset
// into a 132pt window. Crop starts at y 500 so the blob above never shows.
const ART = require("@/assets/images/illustrations/discovery-image-bg.png");
const ART_SCALE = 0.4;
const ART_CROP_X = 230;
const ART_CROP_Y = 500;

// rounded-3xl in px; the art window must match the card's radius.
const CARD_RADIUS = 24;

const styles = StyleSheet.create({
	art: {
		height: 1000 * ART_SCALE,
		left: -ART_CROP_X * ART_SCALE,
		position: "absolute",
		top: -ART_CROP_Y * ART_SCALE,
		width: 1200 * ART_SCALE,
	},
	// Android only honours `overflow: 'hidden'` on a view with a border radius.
	// Right corners only, so the window meets the card's right edge exactly.
	artWindow: {
		borderBottomRightRadius: CARD_RADIUS,
		borderCurve: "continuous",
		borderTopRightRadius: CARD_RADIUS,
		overflow: "hidden",
		width: 132,
	},
	card: { borderCurve: "continuous" },
});

/** Entry point to the quotes screen. Deliberately fetches nothing so discovery stays cheap. */
export function DailyQuotesCard() {
	const router = useRouter();

	const goToQuotes = () => {
		playSoftPress();
		router.push("/(protected)/quotes");
	};

	return (
		<PressableFeedback
			accessibilityLabel="Open daily quotes"
			accessibilityRole="button"
			onPress={goToQuotes}
		>
			<Surface className="flex-row items-center p-0" style={styles.card}>
				<View className="flex-1 py-6 pr-3 pl-5">
					<AppText className="font-semibold text-foreground text-lg">
						Daily Quotes
					</AppText>
					<AppText className="mt-1.5 text-muted text-sm leading-5">
						Curated lines for the day, and the ones your own sessions left
						behind.
					</AppText>
				</View>
				{/* Stretches to the card's height so the rounded corners land on the card's. */}
				<View className="self-stretch" style={styles.artWindow}>
					<Image
						accessibilityElementsHidden
						contentFit="cover"
						importantForAccessibility="no-hide-descendants"
						source={ART}
						style={styles.art}
					/>
				</View>
			</Surface>
		</PressableFeedback>
	);
}
