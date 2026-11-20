import { type HeroUINativeConfig, HeroUINativeProvider } from "heroui-native";
import { PostHogProvider } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
	KeyboardAvoidingView,
	KeyboardProvider,
} from "react-native-keyboard-controller";
import { ToastBridge } from "@/components/shared/toast-bridge";
import { posthog } from "@/config/posthog";
import { AppThemeProvider } from "@/context/app-theme-context";
import { SessionModeProvider } from "@/context/session-mode-context";
import { RevenueCatProvider } from "@/features/purchases/revenuecat-context";
import { PremiumThemeReconciler } from "@/features/settings/premium-theme/premium-theme-reconciler";
import { ConvexClientProvider } from "./convex-provider";

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
									<RevenueCatProvider>
										<PremiumThemeReconciler />
										<ToastBridge />
										{children}
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
