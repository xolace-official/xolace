import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";

// Placeholder until the freeze illustration lands.
const ART = require("@/assets/images/flux/flux-campfire.png");

/** Shown once after a streak freeze covered missed days (#436); opened by home with the count
 * settle() returned. */
export default function StreakHeld() {
	const insets = useSafeAreaInsets();
	const days = Number(useLocalSearchParams<{ days: string }>().days) || 1;
	const acknowledgeFreezes = useMutation(api.streaks.state.acknowledgeFreezes);

	// Acknowledge on the way out, not on open: an app killed while this is up
	// shows it again next launch.
	useEffect(
		() => () => void acknowledgeFreezes().catch(() => {}),
		[acknowledgeFreezes]
	);

	return (
		<View
			className="flex-1 bg-background px-6"
			style={{ paddingBottom: insets.bottom + 16, paddingTop: insets.top + 24 }}
		>
			<View className="flex-1 items-center justify-center">
				<Image
					accessibilityIgnoresInvertColors
					accessible={false}
					contentFit="contain"
					source={ART}
					style={styles.art}
				/>
				<AppText className="mt-8 text-[11px] text-foreground/45 uppercase tracking-widest">
					Streak held
				</AppText>
				<AppText
					accessibilityRole="header"
					className="mt-3 text-center font-serif text-3xl text-foreground"
				>
					Your fire kept burning
				</AppText>
				<AppText className="mt-4 text-center text-[15px] text-foreground/65 leading-6">
					{days > 1
						? `You were away for ${days} days. ${days} freezes covered them, so your streak is still lit.`
						: "You were away for a day. A freeze covered it, so your streak is still lit."}
				</AppText>
			</View>

			<PressableFeedback
				accessibilityLabel="Thank you"
				accessibilityRole="button"
				className="h-13 w-full items-center justify-center rounded-2xl bg-accent"
				onPress={() => router.back()}
			>
				<AppText className="font-[Poppins-Medium] text-accent-foreground text-base">
					Thank you
				</AppText>
			</PressableFeedback>
		</View>
	);
}

const styles = StyleSheet.create({
	art: { height: 260, width: 260 },
});
