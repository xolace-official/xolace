/** Root layout: providers (RootProvider, then NavThemeProvider) around the route groups. */
import "@/lib/clerk-online-polyfill";
import "@/global.css";
import "@/lib/theme-bootstrap";

import { useAuth } from "@clerk/expo";
import {
	Nunito_500Medium,
	Nunito_700Bold,
	Nunito_800ExtraBold,
	Nunito_900Black,
} from "@expo-google-fonts/nunito";
import {
	SpaceGrotesk_400Regular,
	SpaceGrotesk_500Medium,
	SpaceGrotesk_600SemiBold,
	SpaceGrotesk_700Bold,
	useFonts,
} from "@expo-google-fonts/space-grotesk";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { Observe, ObserveRoot, useObserve } from "expo-observe";
import { Stack, useGlobalSearchParams, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { Settings } from "react-native-pulsar";
import { FullRippleLoader } from "@/components/shared/loader/ripple/full-ripple-loader";
import {
	UpdateBottomSheet,
	type UpdateBottomSheetMode,
} from "@/components/shared/update-bottom-sheet";
import { ReflectDraftGuard } from "@/features/reflect/reflect-draft";
import { ChatLocalDataGuard } from "@/features/xolacer-chat/chat-local-data-guard";
import { useOtaUpdate } from "@/helpers/hooks/use-ota-update";
import { useVersionCheck } from "@/helpers/hooks/use-version-check";
import { useFullContext } from "@/lib/convex/use-full-context";
import { usePostHogIdentity } from "@/lib/use-posthog-identity";
import { NavThemeProvider } from "@/providers/nav-theme-provider";
import { RootProvider } from "@/providers/root-provider";
import { useAppStore } from "@/store/store";

Sentry.init({
	dsn: process.env.EXPO_PUBLIC_SENTRY_DNS,

	enableLogs: true,

	// Label events so dev traffic never mixes with production in the dashboard.
	environment: __DEV__ ? "development" : "production",
	integrations: __DEV__ ? [] : [Sentry.mobileReplayIntegration()],
	replaysOnErrorSampleRate: __DEV__ ? 0 : 1,

	// Session Replay in production only.
	replaysSessionSampleRate: __DEV__ ? 0 : 0.1,

	// No auto-collected PII; only the userId for the auth-guard breadcrumbs via Sentry.setUser.
	sendDefaultPii: false,
});

// Must run at module scope before any screen mounts; toggling after mount throws.
// `q` is the raw Browse search query (may be a crisis term, see crisisTerms.ts);
// keep it out of exported navigation metrics.
Observe.configure({
	integrations: { "expo-router": { filteredParams: ["q"] } },
});

SplashScreen.preventAutoHideAsync();

Settings.enableSound(false);
Settings.preloadPresets([
	"Herald", // mirrorArrival, must be instant
	"Bloom", // sessionComplete
	"Feather", // gentlePresence, onboarding transitions
	"Propel", // form submit
	"Strike", // affirmativePress
	"Cascade", // onboardingEntrance
	"BellToll", // followUpEntrance, plays on mount
	"Wobble", // errorNotice, clarifyState mount
	"Peal", // escalationState mount
	"Flick", // carousel advance, textureSelect
	"Thud", // menu open, homeEntrance
	"Chirp", // resonanceToggle, lighter mood
	"Murmur", // peerReflections mount, unsure mood
	"Breath", // processingBreath fallback
	"Swell", // insights overall dial fill, plays on mount
]);

// Expo Router's boundary swallows render crashes, so RouteError reports to
// Sentry and Observe itself before showing a themed screen.
export { RouteError as ErrorBoundary } from "@/components/shared/route-error";

const NO_HEADER = { headerShown: false };
// The root stack only swaps route groups, and on a cold start Stack.Protected
// replaces the first group matching `/` with the right one; animating that
// replacement reads as a push into home, so group swaps cut instead.
const ROOT_SCREEN_OPTIONS = { animation: "none", headerShown: false } as const;

const AppContent = () => {
	const introSeen = useAppStore((s) => s.introSeen);
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
	const { isSignedIn, isLoaded: isClerkLoaded, userId } = useAuth();
	const posthog = usePostHog();

	// The intake gate (T6, #263), hoisted so the root is the single subscriber
	// and Convex dedupes every downstream read.
	const context = useFullContext(!isAuthenticated);
	usePostHogIdentity();
	const onboardingComplete = context?.profile.onboardingComplete === true;
	const intakeGateLoading = isAuthenticated && context === undefined;

	// Breadcrumb the route-group guard's inputs: a wrong (auth) landing on a cold
	// start is either a Clerk cache miss or a Clerk/Convex desync.
	useEffect(() => {
		Sentry.setUser(userId ? { id: userId } : null);
		const group = isAuthenticated
			? onboardingComplete
				? "(protected)"
				: "(intake)"
			: introSeen
				? "(auth)"
				: "(onboarding)";
		Sentry.addBreadcrumb({
			category: "auth.guard",
			data: {
				clerkLoaded: isClerkLoaded,
				clerkSignedIn: !!isSignedIn,
				convexAuthenticated: isAuthenticated,
				convexAuthLoading: isAuthLoading,
				intakeGateLoading,
				introSeen,
				onboardingComplete,
			},
			level:
				isClerkLoaded && isSignedIn && !isAuthenticated ? "warning" : "info",
			message: `route guard → ${group}`,
		});
	}, [
		introSeen,
		isAuthenticated,
		isAuthLoading,
		isClerkLoaded,
		isSignedIn,
		userId,
		onboardingComplete,
		intakeGateLoading,
	]);
	const pathname = usePathname();
	const params = useGlobalSearchParams();
	const previousPathname = useRef<string | undefined>(undefined);
	const { markInteractive } = useObserve();

	useEffect(() => {
		if (!isAuthLoading) {
			markInteractive();
		}
	}, [isAuthLoading, markInteractive]);

	useEffect(() => {
		if (previousPathname.current !== pathname) {
			posthog.screen(pathname, {
				path: typeof params.path === "string" ? params.path : null,
				previous_screen: previousPathname.current ?? null,
			});
			previousPathname.current = pathname;
		}
	}, [pathname, params, posthog]);

	// Hold the loader while the gate query is in flight rather than bouncing
	// the user out of (protected) a frame later.
	if (isAuthLoading || intakeGateLoading) {
		return <FullRippleLoader />;
	}
	return (
		<>
			{/* Above every route group so it outlives (protected); see the component. */}
			<ChatLocalDataGuard />
			<ReflectDraftGuard />
			<Stack screenOptions={ROOT_SCREEN_OPTIONS}>
				<Stack.Protected guard={!(isAuthenticated || introSeen)}>
					<Stack.Screen name="(onboarding)" options={NO_HEADER} />
				</Stack.Protected>
				<Stack.Protected guard={!isAuthenticated && introSeen}>
					<Stack.Screen name="(auth)" options={NO_HEADER} />
				</Stack.Protected>
				<Stack.Protected guard={isAuthenticated && !onboardingComplete}>
					<Stack.Screen name="(intake)" options={NO_HEADER} />
				</Stack.Protected>
				<Stack.Protected guard={isAuthenticated && onboardingComplete}>
					<Stack.Screen name="(protected)" options={NO_HEADER} />
				</Stack.Protected>
			</Stack>
		</>
	);
};

/** `NavThemeProvider` must sit inside `RootProvider`, which owns the theme context it reads. */
function RootLayout() {
	const setIsVersionChecked = useAppStore((s) => s.setIsVersionChecked);
	const setIsNewVersionAvailable = useAppStore(
		(s) => s.setIsNewVersionAvailable
	);
	const isVersionChecked = useAppStore((s) => s.isVersionChecked);
	const isNewVersionAvailable = useAppStore((s) => s.isNewVersionAvailable);
	const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
	const [updateSheetMode, setUpdateSheetMode] =
		useState<UpdateBottomSheetMode>("new-version");

	const handleVersionChecked = (isNew: boolean) => {
		setIsVersionChecked(true);
		setIsNewVersionAvailable(isNew);
		if (isNew) {
			setUpdateSheetMode("new-version");
			setUpdateSheetOpen(true);
		}
	};

	const handleOtaUpdateReady = () => {
		setUpdateSheetMode("ota-update");
		setUpdateSheetOpen(true);
	};

	useVersionCheck({ onVersionChecked: handleVersionChecked });
	useOtaUpdate({
		isNewVersionAvailable,
		isVersionChecked,
		onUpdateReady: handleOtaUpdateReady,
	});

	const [fontsLoaded, fontError] = useFonts({
		// Playful (xolace+) theme
		Nunito_500Medium,
		Nunito_700Bold,
		Nunito_800ExtraBold,
		Nunito_900Black,
		SpaceGrotesk_400Regular,
		SpaceGrotesk_500Medium,
		SpaceGrotesk_600SemiBold,
		SpaceGrotesk_700Bold,
	});

	useEffect(() => {
		if (fontsLoaded || fontError) {
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded, fontError]);

	if (!(fontsLoaded || fontError)) {
		return null;
	}
	return (
		<RootProvider>
			<NavThemeProvider>
				<AppContent />
				<UpdateBottomSheet
					isOpen={updateSheetOpen}
					mode={updateSheetMode}
					onOpenChange={setUpdateSheetOpen}
				/>
			</NavThemeProvider>
		</RootProvider>
	);
}

export default Sentry.wrap(ObserveRoot.wrap(RootLayout));
