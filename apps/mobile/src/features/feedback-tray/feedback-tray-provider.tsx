import { useConvexAuth } from "convex/react";
import { usePathname } from "expo-router";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect } from "react";
import { DevSettings, Platform } from "react-native";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useAppStore } from "@/store/store";
import { TrayProvider, useTray } from "./engine/tray-provider";
import { type Trays, trays } from "./screens/registry";
import { shakeTipDue } from "./trigger/shake-tip";
import { useShakeToOpen } from "./trigger/use-shake-to-open";

const REFLECT_ROUTE = "/";

/** Opens the tray menu and records the open event; structural only, no free text. */
function useOpenFeedbackTray() {
	const { show } = useTray<Trays>();
	const posthog = usePostHog();
	const pathname = usePathname();

	return useCallback(
		(source: "shake" | "dev_menu") => {
			posthog.capture("feedback_tray_opened", { route: pathname, source });
			show("menu");
		},
		[show, posthog, pathname]
	);
}

/** One-time discoverability toast, fired the first time the shake trigger is eligible
 * once the tip is due (`shakeTipDue`: after v2's third session, #712). */
function useShakeHint(eligible: boolean) {
	const { toast } = useToast();
	const shakeHintSeen = useAppStore((s) => s.shakeHintSeen);
	const setShakeHintSeen = useAppStore((s) => s.setShakeHintSeen);
	const { isAuthenticated } = useConvexAuth();
	// Skipped once seen too, so a seen hint costs no subscription.
	const context = useFullContext(!isAuthenticated || shakeHintSeen);
	const due = shakeTipDue(
		context && {
			intakeVersion: context.intake?.intakeVersion,
			onboarded: context.profile.onboardingComplete,
			sessionCount: context.profile.sessionCount,
		}
	);

	useEffect(() => {
		if (!(eligible && due) || shakeHintSeen) {
			return;
		}
		toast.show({
			label: "Shake your phone anytime to send feedback.",
		});
		setShakeHintSeen(true);
	}, [eligible, due, shakeHintSeen, setShakeHintSeen, toast]);
}

/** Wires the shake trigger to the tray for one call site; the caller derives
 * `enabled`. The global default is mounted by FeedbackTrayProvider. */
export function useFeedbackShake({ enabled }: { enabled: boolean }) {
	const open = useOpenFeedbackTray();
	useShakeToOpen({ enabled, onShake: () => open("shake") });
}

/** Dev-only fallback so the tray is testable without shaking a simulator.
 * Registered once here to avoid duplicate menu items; always opens. */
function useDevMenuTrigger() {
	const open = useOpenFeedbackTray();
	useEffect(() => {
		if (__DEV__ && Platform.OS !== "web") {
			return DevSettings.addMenuItem("💬 Send Feedback", () =>
				open("dev_menu")
			);
		}
	}, [open]);
}

/** Global shake call site — active on every screen except the reflect canvas. */
function GlobalFeedbackShake() {
	const pathname = usePathname();
	const enabled = pathname !== REFLECT_ROUTE;
	useDevMenuTrigger();
	// The hint lives here alone: the reflect screen stays mounted under the stack, and a
	// second call site would toast twice when the tip comes due mid-app (#712).
	useShakeHint(enabled);
	useFeedbackShake({ enabled });
	return null;
}

/** Mounts the tray engine, screen registry and global shake listener. Mount as
 * the innermost RootProvider wrapper (needs toast, Convex, keyboard and gesture providers). */
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
