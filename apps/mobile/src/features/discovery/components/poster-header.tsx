import { Image } from "expo-image";
import { useIsFocused } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/shared/app-text";
import { useAppTheme } from "@/context/app-theme-context";
import {
	DISPLAY_LEAD,
	DISPLAY_TAIL,
	getDateStamp,
	getGreeting,
} from "@/features/discovery/greeting";
import { useProfileSummary } from "@/features/profile/hooks/use-profile-summary";

const ART = require("@/assets/images/illustrations/discovery-image-bg.png");

// The source is a 2×2 grid of figures, so it has to be zoomed and offset to
// isolate one; `contentFit`/`contentPosition` alone only pan, they don't zoom.
// Source is 1200×1000; the top-right figure sits at roughly x 620–980, y 40–470.
const ART_SCALE = 0.36;

const styles = StyleSheet.create({
	art: {
		height: 1000 * ART_SCALE,
		left: -630 * ART_SCALE,
		position: "absolute",
		top: -60 * ART_SCALE,
		width: 1200 * ART_SCALE,
	},
	artWindow: { height: 138, width: 128 },
	// Space Grotesk needs negative tracking to hold together at display size.
	// letterSpacing is px in RN, so it can't live in a Tailwind class.
	display: { letterSpacing: -1.1 },
	eyebrow: { letterSpacing: 1.4 },
	// Only the bottom corners round — the field runs off the top of the screen.
	field: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
});

/**
 * Variant A — solid poster masthead. The accent field runs full-bleed under the
 * status bar and closes with a rounded bottom edge, so the brand owns the top of
 * the screen. The illustration sits as a cropped art tile, the way the reference
 * poster offsets its product photo against the type block. No animation.
 *
 * Swap variants in `discovery-header.tsx` — in code, not in the UI.
 */
export function PosterHeader() {
	const insets = useSafeAreaInsets();
	// Same name the profile screen shows — the user-set displayName from
	// preferences, not the Clerk account name.
	const summary = useProfileSummary();
	const { isDark } = useAppTheme();
	// NativeTabs keeps every tab mounted, so an unconditional override here
	// would keep winning even after the user switches away from Discovery.
	const isFocused = useIsFocused();

	return (
		<View className="overflow-hidden bg-accent" style={styles.field}>
			{/* --accent is dark in light theme and light in dark theme, so the status
          bar content inverts against the app theme on this screen only. */}
			{isFocused && <StatusBar style={isDark ? "dark" : "light"} />}

			<View className="px-6 pb-7" style={{ paddingTop: insets.top + 12 }}>
				<AppText
					className="font-medium text-[10px] text-accent-foreground/65 uppercase"
					style={styles.eyebrow}
				>
					{getDateStamp()}
				</AppText>

				<View className="mt-4">
					<AppText
						className="font-bold text-[36px] text-accent-foreground leading-9.5"
						style={styles.display}
					>
						{DISPLAY_LEAD}
					</AppText>
					<AppText
						className="mt-1 font-normal text-[36px] text-accent-foreground/70 leading-9.5"
						style={styles.display}
					>
						{DISPLAY_TAIL}
					</AppText>
				</View>

				<View className="mt-8 flex-row items-end justify-between gap-4">
					<View className="flex-1">
						<AppText className="font-semibold text-[13px] text-accent-foreground">
							{getGreeting(summary?.displayName)}
						</AppText>
						<AppText className="mt-0.5 text-[12px] text-accent-foreground/70 leading-4">
							You made it here again.
						</AppText>
					</View>
					<View
						className="overflow-hidden rounded-[22px]"
						style={styles.artWindow}
					>
						<Image
							accessibilityLabel="Someone listening, quietly"
							contentFit="cover"
							source={ART}
							style={styles.art}
						/>
					</View>
				</View>
			</View>
		</View>
	);
}
