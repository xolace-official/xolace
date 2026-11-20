import { useConvexAuth } from "convex/react";
import { usePathname, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { DevSettings, Platform } from "react-native";
import { toast } from "@/components/shared/toast";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useAppStore } from "@/store/store";
import { FEEDBACK_COPY } from "../copy";
import { shakeTipDue } from "./shake-tip";
import { useShakeToOpen } from "./use-shake-to-open";

/** Opens the feedback sheet on its menu and records the open; structural only, no free text. */
function useOpenFeedback() {
	const router = useRouter();
	const posthog = usePostHog();
	const pathname = usePathname();
	return (source: "shake" | "dev_menu") => {
		posthog.capture("feedback_tray_opened", { route: pathname, source });
		router.push({ params: { from: pathname }, pathname: "/feedback" });
	};
}

/** Wires the shake to the sheet for one call site; the caller derives `enabled`. */
export function useFeedbackShake({ enabled }: { enabled: boolean }) {
	const open = useOpenFeedback();
	useShakeToOpen({ enabled, onShake: () => open("shake") });
}

/** One-time discoverability toast, fired the first time the shake is eligible once the tip is
 * due (`shakeTipDue`: after v2's third session, #712). */
export function useShakeHint(eligible: boolean) {
	const shakeHintSeen = useAppStore((s) => s.shakeHintSeen);
	const setShakeHintSeen = useAppStore((s) => s.setShakeHintSeen);
	const { isAuthenticated } = useConvexAuth();
	// Skipped once seen too, so a seen hint costs no subscription.
	const accountPending = useAppStore((s) => s.accountPending);
	const context = useFullContext(
		!isAuthenticated || accountPending || shakeHintSeen
	);
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
		toast(FEEDBACK_COPY.shakeHint);
		setShakeHintSeen(true);
	}, [eligible, due, shakeHintSeen, setShakeHintSeen]);
}

/** Dev-only fallback so the sheet opens without shaking a simulator. The dev menu can't drop an
 * item, so it is added once, the first time the app mounts, and reads the latest `open`. */
export function useDevMenuTrigger() {
	const open = useOpenFeedback();
	const latest = useRef(open);
	latest.current = open;
	const added = useRef(false);
	useEffect(() => {
		if (__DEV__ && !added.current && Platform.OS !== "web") {
			added.current = true;
			DevSettings.addMenuItem("💬 Send Feedback", () =>
				latest.current("dev_menu")
			);
		}
	}, []);
}
