import { useCallback, useEffect } from "react";
import { DevSettings, Platform } from "react-native";
import { usePathname } from "expo-router";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useAppStore } from "@/src/store/store";
import { TrayProvider, useTray } from "./engine/tray-provider";
import { useShakeToOpen } from "./trigger/use-shake-to-open";
import { trays, type Trays } from "./screens/registry";

const REFLECT_ROUTE = "/";

/**
 * Opens the feedback tray (menu screen) and records the structural open event.
 * No free-text content is captured — structural only ([[project_posthog_convex]]).
 */
function useOpenFeedbackTray() {
  const { show } = useTray<Trays>();
  const posthog = usePostHog();
  const pathname = usePathname();

  return useCallback(
    (source: "shake" | "dev_menu") => {
      posthog.capture("feedback_tray_opened", { source, route: pathname });
      show("menu");
    },
    [show, posthog, pathname],
  );
}

/**
 * One-time discoverability toast — fires the first time the shake trigger is
 * eligible on this device, then never again. Firing a toast is a genuine side
 * effect (not state mirroring), so a guarded effect is appropriate here.
 */
function useShakeHint(eligible: boolean) {
  const { toast } = useToast();
  const shakeHintSeen = useAppStore((s) => s.shakeHintSeen);
  const setShakeHintSeen = useAppStore((s) => s.setShakeHintSeen);

  useEffect(() => {
    if (!eligible || shakeHintSeen) return;
    toast.show({
      label: "Shake your phone anytime to send feedback.",
    });
    setShakeHintSeen(true);
  }, [eligible, shakeHintSeen, setShakeHintSeen, toast]);
}

/**
 * Wires the shake trigger to the tray for one call site, with `enabled`
 * pure-derived by the caller (no state-syncing effects). Use this from the
 * reflect screen (gated by machine state) — the global default is mounted by
 * FeedbackTrayProvider.
 */
export function useFeedbackShake({ enabled }: { enabled: boolean }) {
  const open = useOpenFeedbackTray();
  useShakeHint(enabled);
  useShakeToOpen({ enabled, onShake: () => open("shake") });
}

/**
 * Dev-only fallback so the tray is testable without physically shaking a
 * simulator. Registered once (here, not per call site) to avoid duplicate
 * menu items. Always opens regardless of route/state — it's a manual trigger.
 */
function useDevMenuTrigger() {
  const open = useOpenFeedbackTray();
  useEffect(() => {
    if (__DEV__ && Platform.OS !== "web") {
      return DevSettings.addMenuItem("💬 Send Feedback", () =>
        open("dev_menu"),
      );
    }
  }, [open]);
}

/** Global shake call site — active on every screen except the reflect canvas. */
function GlobalFeedbackShake() {
  const pathname = usePathname();
  useDevMenuTrigger();
  useFeedbackShake({ enabled: pathname !== REFLECT_ROUTE });
  return null;
}

/**
 * Mounts the feedback tray engine + screen registry and the global shake
 * listener. Mount as the innermost wrapper in RootProvider (needs heroui toast,
 * Convex, and the keyboard/gesture providers above it).
 */
export function FeedbackTrayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TrayProvider screens={trays}>
      <GlobalFeedbackShake />
      {children}
    </TrayProvider>
  );
}
