import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useToast } from 'heroui-native';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { playSoftPress } from '@/src/lib/haptics';
import { posthog } from '@/src/config/posthog';
import { useAppStore } from '@/src/store/store';
import { chatLimitError, declineCooldownNote } from '@/src/features/xolacer-chat/utils';

/** `gate` stands in front of a request; `reference` is the same content pulled
 *  up from "What to expect" and sends nothing. */
export type PrimerMode = 'gate' | 'reference' | null;

/**
 * Everything behind "Ask to talk": the request itself, its limit-error toast,
 * and the one-time primer that gates a seeker's first ask.
 *
 * The primer's flag and the request are written on the same success path —
 * acknowledging is only meaningful once something was actually sent, so a
 * request that fails a limit check leaves the sheet open, the flag unset, and
 * the seeker able to try again.
 */
export function useAskFlow({
  xolacerProfileId,
  displayName,
  stepId,
}: {
  xolacerProfileId: Id<'emotional_profiles'>;
  displayName: string;
  /** Kindling twig that led here; tended once a request is actually sent. */
  stepId?: Id<'path_steps'>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const requestConversation = useMutation(api.xolacerChat.requestConversation);
  const completeStep = useMutation(api.paths.completeStep);
  const primerSeen = useAppStore((s) => s.xolacerPrimerSeen);
  const setPrimerSeen = useAppStore((s) => s.setXolacerPrimerSeen);
  const [primerMode, setPrimerMode] = useState<PrimerMode>(null);
  // Ref guards the mutation (two taps in one frame both read stale state);
  // the state drives the button's disabled look.
  const inFlight = useRef(false);
  const [sending, setSending] = useState(false);

  const openThread = (conversationId: string) =>
    router.replace(`/chat/${conversationId}`);

  const sendRequest = (fromGate: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    requestConversation({ xolacerProfileId })
      .then((conversationId) => {
        // Only the success path acknowledges and closes — a limit error leaves
        // the seeker exactly where they were, reading the toast, with the
        // primer unacknowledged so nothing half-commits.
        if (fromGate) {
          setPrimerSeen(true);
          posthog.capture('xolacer_primer_resolved', { outcome: 'sent' });
        }
        setPrimerMode(null);
        // The conversation exists either way — a failed tend is not a failed
        // ask, so it never surfaces. Server no-ops on an already-settled twig.
        if (stepId) completeStep({ stepId }).catch(() => {});
        openThread(conversationId);
      })
      .catch((error: unknown) => {
        const data = chatLimitError(error);
        toast.show({
          label:
            // Only reachable from a screen that loaded before the decline —
            // the CTA replaces itself once the cooldown is in the query.
            data?.code === 'decline_cooldown' && data.until
              ? declineCooldownNote(displayName, data.until)
              : data?.code === 'pending_request_limit'
                ? `You're already waiting on ${data.max ?? 2} Xolacers. Give them a moment to reply.`
                : data?.code === 'open_conversation_limit'
                  ? `You've got ${data.max ?? 3} conversations open. Let one rest before starting another.`
                  : `${displayName} isn't taking conversations right now.`,
        });
      })
      .finally(() => {
        inFlight.current = false;
        setSending(false);
      });
  };

  const handleAsk = () => {
    playSoftPress();
    if (primerSeen) {
      sendRequest(false);
      return;
    }
    posthog.capture('xolacer_primer_shown');
    setPrimerMode('gate');
  };

  const handlePrimerConfirm = () => {
    playSoftPress();
    sendRequest(true);
  };

  // Dismissing a gate — swipe, backdrop or close button — is an abandonment
  // whether or not a send was attempted first, and writes no flag. A send
  // already in flight owns the sheet: closing under it would strand the
  // acknowledgment while the request still succeeds.
  const handlePrimerClose = () => {
    if (inFlight.current) return;
    if (primerMode === 'gate')
      posthog.capture('xolacer_primer_resolved', { outcome: 'dismissed' });
    setPrimerMode(null);
  };

  const openPrimerReference = () => {
    playSoftPress();
    setPrimerMode('reference');
  };

  return {
    primerMode,
    sending,
    openThread,
    handleAsk,
    handlePrimerConfirm,
    handlePrimerClose,
    openPrimerReference,
  };
}
