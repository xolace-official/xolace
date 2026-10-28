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

// Crop anchored low so the figures sit under the type block, not behind it.
const ART_CROP = { bottom: 0 } as const;

const styles = StyleSheet.create({
	display: { letterSpacing: -1.1 },
	eyebrow: { letterSpacing: 1.4 },
	field: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
});

/** Same content as `PosterHeader` with the art full-bleed under an accent scrim. Swapped in
 * `discovery-header.tsx`. */
export function ImageHeader() {
	const insets = useSafeAreaInsets();
	const summary = useProfileSummary();
	const { isDark } = useAppTheme();
	// NativeTabs keeps every tab mounted; an unconditional override would outlive the tab.
	const isFocused = useIsFocused();

	return (
		<View className="overflow-hidden bg-accent" style={styles.field}>
			{isFocused && <StatusBar style={isDark ? "dark" : "light"} />}

			<Image
				accessibilityElementsHidden
				contentFit="cover"
				contentPosition={ART_CROP}
				importantForAccessibility="no-hide-descendants"
				source={ART}
				style={StyleSheet.absoluteFill}
			/>
			{/* Scrim: below ~85% the eyebrow and greeting drop under 4.5:1. */}
			<View className="absolute inset-0 bg-accent/90" />

			<View className="px-6 pb-7" style={{ paddingTop: insets.top + 12 }}>
				<AppText
					className="font-medium text-[10px] text-accent-foreground/70 uppercase"
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
						className="mt-1 font-normal text-[36px] text-accent-foreground/75 leading-9.5"
						style={styles.display}
					>
						{DISPLAY_TAIL}
					</AppText>
				</View>

				<View className="mt-10">
					<AppText className="font-semibold text-[13px] text-accent-foreground">
						{getGreeting(summary?.displayName)}
					</AppText>
					<AppText className="mt-0.5 text-[12px] text-accent-foreground/75 leading-4">
						You made it here again.
					</AppText>
				</View>
			</View>
		</View>
	);
}
