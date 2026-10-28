import { type HeroUINativeConfig, HeroUINativeProvider } from "heroui-native";
import { PostHogProvider } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
	KeyboardAvoidingView,
	KeyboardProvider,
} from "react-native-keyboard-controller";
import { posthog } from "@/config/posthog";
import { AppThemeProvider } from "@/context/app-theme-context";
import { SessionModeProvider } from "@/context/session-mode-context";
import { FeedbackTrayProvider } from "@/features/feedback-tray/feedback-tray-provider";
import { RevenueCatProvider } from "@/features/purchases/revenuecat-context";
import { PremiumThemeReconciler } from "@/features/settings/premium-theme-reconciler";
import { ConvexClientProvider } from "./convex-provider";

/**
 * Root provider that composes all app-wide providers in the correct order.
 *
 * Provider hierarchy:
 *   GestureHandlerRootView → KeyboardProvider → AppThemeProvider → SessionModeProvider → PostHogProvider → ConvexClientProvider → HeroUINativeProvider
 *
 * Customize this for your app:
 * - Add your own providers (e.g. auth, analytics, query client) inside the chain
 * - Adjust the HeroUINativeConfig to configure toast behavior, dev info, etc.
 * - The KeyboardAvoidingView wraps toast content — modify keyboardVerticalOffset as needed
 */
const FLEX_1 = { flex: 1 };
const AUTO_CAPTURE = {
	captureScreens: false,
	captureTouches: true,
	propsToCapture: ["testID"],
};

export function RootProvider({ children }: { children: React.ReactNode }) {
	const contentWrapper = (children: React.ReactNode) => (
		<KeyboardAvoidingView
			behavior="padding"
			keyboardVerticalOffset={12}
			pointerEvents="box-none"
			style={FLEX_1}
		>
			{children}
		</KeyboardAvoidingView>
	);

	const config: HeroUINativeConfig = {
		devInfo: {
			stylingPrinciples: false,
		},
		toast: {
			contentWrapper,
		},
	};

	return (
		<GestureHandlerRootView style={FLEX_1}>
			<KeyboardProvider>
				<AppThemeProvider>
					<SessionModeProvider>
						<PostHogProvider autocapture={AUTO_CAPTURE} client={posthog}>
							<ConvexClientProvider>
								<HeroUINativeProvider config={config}>
									{/* Inside Convex (logIn needs the authed profile id) and
                      inside HeroUI (purchase/restore toasts). */}
									<RevenueCatProvider>
										<PremiumThemeReconciler />
										<FeedbackTrayProvider>{children}</FeedbackTrayProvider>
									</RevenueCatProvider>
								</HeroUINativeProvider>
							</ConvexClientProvider>
						</PostHogProvider>
					</SessionModeProvider>
				</AppThemeProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}
