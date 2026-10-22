import { StatusBar } from "expo-status-bar";

import { AuthOnboardingShell } from "@/src/features/onboarding/components/auth-onboarding/auth-onboarding-shell";

export const AuthOnboardingScreen = () => (
	<>
		<StatusBar hidden />
		<AuthOnboardingShell />
	</>
);
