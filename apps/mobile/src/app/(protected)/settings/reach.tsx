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
	useEffect(() => {
		if (enabled === false && canGoBack) {
			router.back();
		}
	}, [enabled, canGoBack, router]);

	if (enabled === false) {
		return canGoBack ? null : <Redirect href="/settings/notifications" />;
	}
	if (enabled === undefined) {
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
