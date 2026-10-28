import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { useRouter } from "expo-router";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import {
	type IntakeOutcome,
	trackIntakeCompleted,
} from "@/features/intake/analytics";
import { useAppStore } from "@/store/store";

type CompleteArgs = FunctionArgs<typeof api.intake.complete>;

// Terminal step of intake: write the answers, clear the draft slice, land in the app.
// Fires at paywall exit because `onboardingComplete` drives the root guard and must
// not flip earlier. Resolves `true` when the write landed, `false` when it was swallowed.
export function useIntakeComplete() {
	const complete = useMutation(api.intake.complete);
	const router = useRouter();
	const { toast } = useToast();
	const posthog = usePostHog();

	return async (outcome: IntakeOutcome): Promise<boolean> => {
		const { intakeAnswers, resetIntakeAnswers } = useAppStore.getState();
		try {
			await complete(intakeAnswers as CompleteArgs);
		} catch (error) {
			// Stay in intake: the guard still reads onboardingComplete: false. Intake has no
			// back edge, so a silent failure would leave the user tapping a dead button.
			Sentry.captureException(error);
			toast.show({
				description: "Check your connection and try again.",
				label: "Couldn't finish setting up",
			});
			return false;
		}
		// After the mutation resolves, so a failed write stays out of the funnel.
		trackIntakeCompleted(posthog, outcome, intakeAnswers);
		resetIntakeAnswers();
		router.replace("/(protected)");
		return true;
	};
}
