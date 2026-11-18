import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useHeaderHeight } from "expo-router/react-navigation";
import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";

/** Starts a chat's body below the header: iOS 26's glass header is see-through and content
 * starts at y=0, which would also skew the keyboard offset the messages measure. */
export function BodyFrame({ children }: { children: ReactNode }) {
	const headerHeight = useHeaderHeight();
	const underGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
	return (
		<View
			className="flex-1 bg-background"
			style={{ paddingTop: underGlass ? headerHeight : 0 }}
		>
			{children}
		</View>
	);
}

/** Messages couldn't load: a quiet line and a way to try again. */
export function MessagesFailed({
	message,
	retry,
	onRetry,
}: {
	message: string;
	retry: string;
	onRetry: () => void;
}) {
	return (
		<View className="flex-1 items-center justify-center gap-4 px-10">
			<AppText center color="muted" variant="callout">
				{message}
			</AppText>
			<PressScale
				accessibilityLabel={retry}
				accessibilityRole="button"
				className="min-h-11 justify-center rounded-full bg-surface-secondary px-5"
				onPress={onRetry}
			>
				<AppText variant="callout" weight="semibold">
					{retry}
				</AppText>
			</PressScale>
		</View>
	);
}
