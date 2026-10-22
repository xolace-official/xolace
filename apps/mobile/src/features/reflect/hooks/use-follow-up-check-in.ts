import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { FollowUpParams } from "@/src/features/follow-up/follow-up-screen";

type Args = {
  /** Gate: only arm once the reflect screen is focused + context has loaded. */
  active: boolean;
  /** From getFullContext — is there any active follow-up card for this user? */
  hasPendingFollowUp: boolean;
};

type Result = {
  /**
   * True whenever a follow-up is pending/ready — used by the reflect screen to
   * suppress ReturnWelcomeSheet on this reopen (the follow-up wins precedence).
   */
  blocking: boolean;
};

/**
 * Drives the follow-up check-in on app reopen.
 *
 * On activation (reflect-screen load with a pending card) it calls `markReturn`
 * exactly once — the server-side gap guard decides whether to emit the
 * `userReturned` event, so this is safe to fire on every qualifying reopen. The
 * workflow then flips the card to `ready`, which arrives reactively via
 * `getReadyCard`. The card is then marked `shown` and the full-screen
 * `/follow-up` route opened, which owns resolve/dismiss from there.
 */
export function useFollowUpCheckIn({ active, hasPendingFollowUp }: Args): Result {
  const router = useRouter();
  const posthog = usePostHog();
  const markReturn = useMutation(api.followUps.markReturn);
  const markShown = useMutation(api.followUps.markShown);

  // Only subscribe to the card once there is something to surface. Any card
  // `getReadyCard` returns is one the server has decided is surfaceable now (a
  // fresh `ready` card, or a `shown` card past its re-show cooldown).
  const card = useQuery(
    api.followUps.getReadyCard,
    active && hasPendingFollowUp ? {} : "skip",
  );

  // Fire markReturn once per activation when a pending follow-up exists.
  const returnedRef = useRef(false);
  useEffect(() => {
    if (!active || !hasPendingFollowUp) {
      returnedRef.current = false;
      return;
    }
    if (returnedRef.current) return;
    returnedRef.current = true;
    void markReturn({});
  }, [active, hasPendingFollowUp, markReturn]);

  // Open each surfaced card once per mount. The route resolves the card on any
  // exit, so it never comes back — unless the app dies with it open, and then
  // this ref is fresh on the next launch and the card re-opens after its
  // cooldown. markShown re-stamps `shownAt` so that cooldown restarts here.
  const openedRef = useRef<Id<"follow_up_cards"> | null>(null);
  useEffect(() => {
    if (!card || openedRef.current === card._id) return;
    openedRef.current = card._id;
    void markShown({ cardId: card._id });
    posthog.capture("follow_up_shown", {
      tier: card.tier,
      escalation_derived: card.escalationDerived,
    });
    const params: FollowUpParams = {
      cardId: card._id,
      cardText: card.cardText,
      tier: card.tier,
      escalation: card.escalationDerived ? "1" : undefined,
    };
    router.push({ pathname: "/follow-up", params });
  }, [card, markShown, posthog, router]);

  return { blocking: active && hasPendingFollowUp };
}
