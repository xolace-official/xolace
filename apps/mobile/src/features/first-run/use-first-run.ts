import { useAuth } from "@clerk/expo";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { useScheme } from "@/design/scheme";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useAppStore } from "@/store/store";
import type { FirstRun } from "./first-run-data";
import { useSignIn } from "./use-sign-in";

export function useFirstRun(): FirstRun {
	const introSeen = useAppStore((s) => s.introSeen);
	const setIntroSeen = useAppStore((s) => s.setIntroSeen);
	const seatHeld = useAppStore((s) => s.seatHeld);
	const { isSignedIn } = useAuth();
	const posthog = usePostHog();
	const [start] = useState<FirstRun["state"]["start"]>(
		introSeen ? "seat" : "promise"
	);
	const reduced = useEffectiveReducedMotion();
	const day = useScheme() === "light";
	const { signIn, release } = useSignIn();
	return {
		actions: {
			acceptPromise: () => {
				posthog.capture("onboarding_completed");
				setIntroSeen(true);
			},
			seated: release,
			signIn,
		},
		state: { day, reduced, sessionHeld: seatHeld && !!isSignedIn, start },
	};
}
