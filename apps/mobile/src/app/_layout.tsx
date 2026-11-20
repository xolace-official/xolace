/** Root layout: providers (RootProvider, then NavThemeProvider) around the route groups. */
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
import { isGroupOpen, rootGate } from "@/features/navigation/root-gate";
import { ReflectDraftGuard } from "@/features/reflect/reflect-draft";
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
// Keeps search queries and letter ids out of exported navigation metrics (screen-name.ts).
Observe.configure({
	integrations: {
		"expo-router": { filteredParams: [...OBSERVE_FILTERED_PARAMS] },
	},
});

SplashScreen.preventAutoHideAsync();
// The launch cover's first frame is the native splash's last, so the native one hides with no fade.
SplashScreen.setOptions({ fade: false });

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
	"Dewdrop", // contributed confirmation; the redesign's twig landing and words going out
]);

// Expo Router's boundary swallows render crashes, so RouteError reports to
// Sentry and Observe itself before showing a themed screen.
export { RouteError as ErrorBoundary } from "@/components/shared/route-error";

const NO_HEADER = { headerShown: false };
// The root stack only swaps route groups, and on a cold start Stack.Protected
// replaces the first group matching `/` with the right one; animating that
// replacement reads as a push into home, so group swaps cut instead.
const ROOT_SCREEN_OPTIONS = { animation: "none", headerShown: false } as const;

/** The update notice, the root's own sheet, on the redesign's form sheet. It is a root route
 * because it opens signed out too. It slides up as sheets do: the root's `animation: "none"` is for group swaps only. */
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
	const { isSignedIn, isLoaded: isClerkLoaded, userId } = useAuth();
	const posthog = usePostHog();

	// The intake gate (T6, #263), hoisted so the root is the single subscriber
	// and Convex dedupes every downstream read.
	// Skipped until the account exists too: before `getOrCreate` lands it throws `user_not_found`.
	const context = useFullContext(!isAuthenticated || accountPending);
	usePostHogIdentity();
	// `undefined` only while the query is in flight (the gate waits on it once signed
	// in); an answered query with no flag on the profile is "not done", as before.
	const onboardingComplete =
		context === undefined
			? undefined
			: context.profile.onboardingComplete === true;
	const gate = rootGate({
		authenticated: isAuthenticated,
		authLoading: isAuthLoading,
		onboardingComplete,
		seatHeld,
	});
	const pathname = usePathname();
	const revealed = useLaunchRevealed();
	// A root sheet can't present over a group's own sheet or modal, so the notice waits for it.
	useUpdatePrompt({
		gateLoading: gate === "loading",
		presented: isPresentedRoute(pathname),
		revealed,
	});
	const rootSheet = useRootSheet();

	// Breadcrumb the route-group guard's inputs: a wrong (first-run) landing on a cold
	// start is either a Clerk cache miss or a Clerk/Convex desync.
	useEffect(() => {
		Sentry.setUser(userId ? { id: userId } : null);
		Sentry.addBreadcrumb({
			category: "auth.guard",
			data: {
				accountPending,
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
		// Reported by name: a route with an id in its path (a letter's) reports its pattern.
		const screen = screenName(pathname);
		if (previousPathname.current !== screen) {
			posthog.screen(screen, {
				path: typeof params.path === "string" ? params.path : null,
				previous_screen: previousPathname.current ?? null,
			});
			previousPathname.current = screen;
		}
	}, [pathname, params, posthog]);

	// Render no routes while the gate is finding out, rather than bouncing someone out of
	// (protected) a frame later: at launch the cover stays up; after it, a quiet loading state.
	if (gate === "loading") {
		return <LaunchHold reason="gate" />;
	}
	return (
		<>
			{/* Above every route group so it outlives (protected); see the component. */}
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
				<Stack.Screen name="update" options={rootSheet} />
			</Stack>
		</>
	);
};

/** `NavThemeProvider` must sit inside `RootProvider`, which owns the theme context it reads. */
function RootLayout() {
	// The theme's font pair, Default's and the fixed faces (src/design/fonts.ts). The launch
	// cover (src/features/launch) stays up until they're in; if they hang past it, the hold shows
	// its quiet spinner rather than an empty window.
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
