import "@/lib/clerk-online-polyfill";
import "@/global.css";
import "@/lib/theme-bootstrap";

import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { Observe, ObserveRoot } from "expo-observe";
import { Stack, useGlobalSearchParams, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { Settings } from "react-native-pulsar";
import { useLaunchFonts } from "@/design/fonts";
import { useUpdatePrompt } from "@/features/app-update/use-update-prompt";
import { LaunchCover } from "@/features/launch/launch-cover";
import { LaunchHold } from "@/features/launch/launch-hold";
import { useLaunchRevealed } from "@/features/launch/launch-store";
import { isPresentedRoute } from "@/features/navigation/presented-routes";
import { isGroupOpen } from "@/features/navigation/root-gate";
import { useRootGate } from "@/features/navigation/use-root-gate";
import { ReflectDraftGuard } from "@/features/reflect/reflect-draft";
import { useCantReachXolace } from "@/lib/connection/use-connection";
import { useFullContext } from "@/lib/convex/use-full-context";
import { fitSheet } from "@/lib/root-screen";
import { OBSERVE_FILTERED_PARAMS, screenName } from "@/lib/screen-name";
import { ChatLocalDataGuard } from "@/lib/stream-chat/chat-local-data-guard";
import { usePostHogIdentity } from "@/lib/use-posthog-identity";
import { NavThemeProvider } from "@/providers/nav-theme-provider";
import { RootProvider } from "@/providers/root-provider";
import { useAppStore } from "@/store/store";

Sentry.init({
	dsn: process.env.EXPO_PUBLIC_SENTRY_DNS,

	enableLogs: true,

	environment: __DEV__ ? "development" : "production",
	integrations: __DEV__ ? [] : [Sentry.mobileReplayIntegration()],
	replaysOnErrorSampleRate: __DEV__ ? 0 : 1,

	replaysSessionSampleRate: __DEV__ ? 0 : 0.1,

	sendDefaultPii: false,
});

// Must run at module scope before any screen mounts; toggling after mount throws.
Observe.configure({
	integrations: {
		"expo-router": { filteredParams: [...OBSERVE_FILTERED_PARAMS] },
	},
});

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: false });

Settings.enableSound(false);
Settings.preloadPresets([
	"Herald",
	"Bloom",
	"Feather",
	"Propel",
	"Strike",
	"Cascade",
	"BellToll",
	"Wobble",
	"Peal",
	"Flick",
	"Thud",
	"Chirp",
	"Murmur",
	"Breath",
	"Swell",
	"Dewdrop",
]);

// Expo Router's boundary swallows render crashes, so RouteError reports to
// Sentry and Observe itself before showing a themed screen.
export { RouteError as ErrorBoundary } from "@/components/shared/route-error";

const NO_HEADER = { headerShown: false };
const ROOT_SCREEN_OPTIONS = { animation: "none", headerShown: false } as const;

function useRootSheet() {
	const surface = useThemeColor("surface");
	return {
		...fitSheet({
			background: "",
			liquidGlass: false,
			reducedMotion: false,
			surface,
		}),
		animation: "default",
	} as const;
}

const AppContent = () => {
	const introSeen = useAppStore((s) => s.introSeen);
	const seatHeld = useAppStore((s) => s.seatHeld);
	const accountPending = useAppStore((s) => s.accountPending);
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
	const cantReachXolace = useCantReachXolace();
	const { isSignedIn, isLoaded: isClerkLoaded, userId } = useAuth();
	const posthog = usePostHog();

	const context = useFullContext(!isAuthenticated || accountPending);
	usePostHogIdentity();
	const onboardingComplete =
		context === undefined
			? undefined
			: context.profile.onboardingComplete === true;
	const pathname = usePathname();
	const gate = useRootGate({
		authenticated: isAuthenticated,
		authLoading: isAuthLoading,
		cantReachXolace,
		onboardingComplete,
		seatHeld,
	});
	const revealed = useLaunchRevealed();
	// A root sheet can't present over a group's own sheet or modal, so the notice waits for it.
	useUpdatePrompt({
		gateLoading: gate === "loading" || gate === "(cant-reach)",
		presented: isPresentedRoute(pathname),
		revealed,
	});
	const rootSheet = useRootSheet();

	useEffect(() => {
		Sentry.setUser(userId ? { id: userId } : null);
		Sentry.addBreadcrumb({
			category: "auth.guard",
			data: {
				accountPending,
				cantReachXolace,
				clerkLoaded: isClerkLoaded,
				clerkSignedIn: !!isSignedIn,
				convexAuthenticated: isAuthenticated,
				convexAuthLoading: isAuthLoading,
				introSeen,
				onboardingComplete: onboardingComplete ?? null,
				seatHeld,
			},
			level:
				isClerkLoaded && isSignedIn && !isAuthenticated ? "warning" : "info",
			message: `route guard → ${gate}`,
		});
	}, [
		accountPending,
		cantReachXolace,
		gate,
		introSeen,
		isAuthenticated,
		isAuthLoading,
		isClerkLoaded,
		isSignedIn,
		userId,
		onboardingComplete,
		seatHeld,
	]);
	const params = useGlobalSearchParams();
	const previousPathname = useRef<string | undefined>(undefined);

	useEffect(() => {
		const screen = screenName(pathname);
		if (previousPathname.current !== screen) {
			posthog.screen(screen, {
				path: typeof params.path === "string" ? params.path : null,
				previous_screen: previousPathname.current ?? null,
			});
			previousPathname.current = screen;
		}
	}, [pathname, params, posthog]);

	if (gate === "loading") {
		return <LaunchHold reason="gate" />;
	}
	return (
		<>
			<ChatLocalDataGuard />
			<ReflectDraftGuard />
			<Stack screenOptions={ROOT_SCREEN_OPTIONS}>
				<Stack.Protected guard={isGroupOpen(gate, "(first-run)")}>
					<Stack.Screen name="(first-run)" options={NO_HEADER} />
				</Stack.Protected>
				<Stack.Protected guard={isGroupOpen(gate, "(intake)")}>
					<Stack.Screen name="(intake)" options={NO_HEADER} />
				</Stack.Protected>
				<Stack.Protected guard={isGroupOpen(gate, "(protected)")}>
					<Stack.Screen name="(protected)" options={NO_HEADER} />
				</Stack.Protected>
				<Stack.Protected guard={isGroupOpen(gate, "(cant-reach)")}>
					<Stack.Screen name="(cant-reach)" options={NO_HEADER} />
				</Stack.Protected>
				<Stack.Screen name="update" options={rootSheet} />
			</Stack>
		</>
	);
};

function RootLayout() {
	const fontsReady = useLaunchFonts();

	return (
		<>
			{fontsReady ? (
				<RootProvider>
					<NavThemeProvider>
						<AppContent />
					</NavThemeProvider>
				</RootProvider>
			) : (
				<LaunchHold reason="fonts" />
			)}
			<LaunchCover />
		</>
	);
}

export default Sentry.wrap(ObserveRoot.wrap(RootLayout));
