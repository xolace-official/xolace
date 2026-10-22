import { HeroUINativeConfig, HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  KeyboardAvoidingView,
  KeyboardProvider,
} from "react-native-keyboard-controller";
import { PostHogProvider } from "posthog-react-native";
import { AppThemeProvider } from "@/src/context/app-theme-context";
import { SessionModeProvider } from "@/src/context/session-mode-context";
import { ConvexClientProvider } from "./convex-provider";
import { posthog } from "@/src/config/posthog";
import { FeedbackTrayProvider } from "@/src/features/feedback-tray/feedback-tray-provider";
import { RevenueCatProvider } from "@/src/features/purchases/revenuecat-context";
import { PremiumThemeReconciler } from "@/src/features/purchases/premium-theme-reconciler";

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
      pointerEvents="box-none"
      behavior="padding"
      keyboardVerticalOffset={12}
      style={FLEX_1}
    >
      {children}
    </KeyboardAvoidingView>
  );

  const config: HeroUINativeConfig = {
    toast: {
      contentWrapper,
    },
    devInfo: {
      stylingPrinciples: false,
    },
  };

  return (
    <GestureHandlerRootView style={FLEX_1}>
      <KeyboardProvider>
        <AppThemeProvider>
          <SessionModeProvider>
            <PostHogProvider client={posthog} autocapture={AUTO_CAPTURE}>
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
