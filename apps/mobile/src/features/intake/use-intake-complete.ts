import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useToast } from 'heroui-native';
import { usePostHog } from 'posthog-react-native';
import type { FunctionArgs } from 'convex/server';
import * as Sentry from '@sentry/react-native';

import { api } from '@/convex/_generated/api';
import { trackIntakeCompleted, type IntakeOutcome } from '@/src/features/intake/analytics';
import { useAppStore } from '@/src/store/store';

type CompleteArgs = FunctionArgs<typeof api.intake.complete>;

/**
 * Terminal step of intake: write the answers, clear the draft slice, land in
 * the app. Fires at paywall exit — both exits, the "Not now" link and a
 * completed purchase — because `onboardingComplete` is what the root guard
 * reads, and it must not flip before the user has actually left the paywall.
 *
 * The `replace` is belt-and-braces: the reactive guard evicts `(intake)` on
 * its own once the flag lands.
 *
 * Resolves `true` when the write landed, `false` when it was swallowed — a
 * caller that renders nothing while it waits needs to know it has to offer a
 * retry, since the toast is the only other thing that said so.
 */
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
      // Stay in intake — the guard still reads onboardingComplete: false, so
      // bouncing to (protected) here would only be undone on the next render.
      // Say so out loud: intake has no back edge, so a silent failure would
      // leave the user tapping a button that does nothing.
      Sentry.captureException(error);
      toast.show({
        label: "Couldn't finish setting up",
        description: 'Check your connection and try again.',
      });
      return false;
    }
    // After the mutation resolves, before the slice is cleared — a failed
    // write stays out of the funnel, since the user is still in intake.
    trackIntakeCompleted(posthog, outcome, intakeAnswers);
    resetIntakeAnswers();
    router.replace('/(protected)');
    return true;
  };
}
