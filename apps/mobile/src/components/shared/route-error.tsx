import * as Sentry from "@sentry/react-native";
import { Observe } from "expo-observe";
import type { ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/shared/app-text";

// Root route error fallback, rendered outside RootProvider: no HeroUI, Clerk, Convex or
// theme context, so plain RN and global tokens only. Reports the error itself; the
// message is never shown in production.
export function RouteError({ error, retry }: ErrorBoundaryProps) {
	const insets = useSafeAreaInsets();

	useEffect(() => {
		Sentry.captureException(error);
		Observe.reportError(error);
	}, [error]);

	return (
		<View
			className="flex-1 items-center justify-center gap-3 bg-background px-10"
			style={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
		>
			<AppText
				accessibilityRole="header"
				className="text-center font-semibold text-xl"
			>
				Something went wrong
			</AppText>
			<AppText className="text-center text-base text-muted">
				Try again to reload this screen.
			</AppText>
			<Pressable
				accessibilityLabel="Try again"
				accessibilityRole="button"
				className="mt-4 rounded-full bg-accent/10 px-8 py-3"
				onPress={retry}
			>
				<AppText className="text-center font-semibold text-accent text-base">
					Try again
				</AppText>
			</Pressable>
			{__DEV__ ? (
				<AppText className="mt-6 text-center text-muted text-xs" selectable>
					{error.message}
				</AppText>
			) : null}
		</View>
	);
}
