import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import {
	intakeOutcomeOf,
	trackIntakeCompleted,
} from "@/features/intake/analytics";
import { completeArgs } from "@/features/intake/v2/heard";
import {
	firstAnswerToOffer,
	type IntakeV2State,
} from "@/features/intake/v2/machine";
import { useAppStore } from "@/store/store";

/**
 * v2's terminal step, after the name or Xolace+: `intake.v2.complete`, then the Mirror, holding the first answer for
 * "Pick up where you left off", unless it led to crisis support. Resolves `false` when the write was swallowed, so the flow
 * can hand back a live button (intake has no back edge).
 */
export function useIntakeV2Complete() {
	const complete = useMutation(api.intake.v2.complete);
	const router = useRouter();
	const { toast } = useToast();
	const posthog = usePostHog();
	const { userId } = useAuth();

	return async (state: IntakeV2State): Promise<boolean> => {
		const { setIntakeFirstAnswer } = useAppStore.getState();
		const text = firstAnswerToOffer(state);
		// Before the write, so a safety verdict landing during it can still clear this.
		setIntakeFirstAnswer(text && userId ? { text, userId } : null);
		try {
			await complete(completeArgs(state.name, state.heard));
		} catch (error) {
			setIntakeFirstAnswer(null);
			Sentry.captureException(error);
			toast.show({
				description: "Check your connection and try again.",
				label: "Couldn't finish setting up",
			});
			return false;
		}
		// After the write, so a failed one stays out of the funnel. v2 has no series branch.
		trackIntakeCompleted(posthog, intakeOutcomeOf(state), {});
		router.replace("/(protected)");
		return true;
	};
}
