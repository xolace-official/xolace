import { Redirect, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { ReachMeOnSheet } from "@/features/reach-me-on/components/reach-me-on-sheet";
import { ReachSheetData } from "@/features/reach-me-on/reach-sheet-data";
import { useReachMeOnFlag } from "@/features/reach-me-on/use-reach-channels";

export default function ReachRoute() {
	const enabled = useReachMeOnFlag();
	const router = useRouter();
	const canGoBack = router.canGoBack();
	// Behind the flag like its row. With the flag off the sheet closes back to
	// where it opened from; a deep link with nothing behind it lands on
	// Notifications instead.
	useEffect(() => {
		if (enabled === false && canGoBack) {
			router.back();
		}
	}, [enabled, canGoBack, router]);

	if (enabled === false) {
		return canGoBack ? null : <Redirect href="/settings/notifications" />;
	}
	if (enabled === undefined) {
		// PostHog hasn't loaded flags yet.
		return (
			<View className="flex-1 items-center bg-background py-12">
				<ActivityIndicator accessibilityLabel="Loading" />
			</View>
		);
	}
	return (
		<ReachSheetData>
			<ReachMeOnSheet />
		</ReachSheetData>
	);
}
