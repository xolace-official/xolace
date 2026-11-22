import * as Sentry from "@sentry/react-native";
import { Observe } from "expo-observe";
import type { ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/shared/app-text";
import { ErrorRetry } from "@/components/shared/error-retry";
import { releaseNativeAppearance } from "@/lib/native-appearance";

export function RouteError({ error, retry }: ErrorBoundaryProps) {
	const insets = useSafeAreaInsets();

	useEffect(() => {
		Sentry.captureException(error);
		Observe.reportError(error);
		SplashScreen.hideAsync().catch(() => undefined);
		releaseNativeAppearance();
	}, [error]);

	return (
		<View
			className="flex-1 items-center justify-center bg-background px-10"
			style={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
		>
			<ErrorRetry
				message="Try again to reload this screen."
				onRetry={retry}
				retryLabel="Try again"
				title="Something went wrong"
			/>
			{__DEV__ ? (
				<AppText
					center
					className="mt-6"
					color="subtle"
					selectable
					variant="caption"
				>
					{error.message}
				</AppText>
			) : null}
		</View>
	);
}
