import { useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-react-native";
import { plusOfferCopy } from "@/src/features/purchases/plus-offer-copy";
import {
  plusOfferSurfaceForMoment,
  type PlusOfferMoment,
  type PlusOfferVariant,
} from "@/src/features/purchases/plus-offer-policy";
import { playSoftPress } from "@/src/lib/haptics";
import { useAppStore } from "@/src/store/store";

type Options = {
  moment: PlusOfferMoment;
  variant?: PlusOfferVariant;
  sessionId?: string | null;
  onOpen: () => void;
  onDismiss?: () => void;
};

/**
 * What every rendering of a proactive Plus offer owes the policy, whatever it
 * looks like: it records itself shown on mount (an appearance spends the
 * one-per-session budget, a decision does not), and a decline spends the
 * surface's cooldown and takes the ask off screen. A second-ask-after-"no" is
 * the bug this keeps out of every call site.
 */
export function usePlusOfferPresence({
  moment,
  variant = "default",
  sessionId = null,
  onOpen,
  onDismiss,
}: Options) {
  const posthog = usePostHog();
  const recordDismissal = useAppStore((s) => s.recordPlusOfferDismissal);
  const recordShown = useAppStore((s) => s.recordPlusOfferShown);
  const shownRef = useRef(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    posthog.capture("plus_offer_shown", { moment, variant });
    recordShown(sessionId);
  }, [posthog, moment, variant, recordShown, sessionId]);

  const open = () => {
    playSoftPress();
    onOpen();
  };

  const dismiss = () => {
    playSoftPress();
    setDeclined(true);
    posthog.capture("plus_offer_dismissed", { moment, variant });
    recordDismissal(plusOfferSurfaceForMoment(moment));
    onDismiss?.();
  };

  return { copy: plusOfferCopy(moment, variant), declined, open, dismiss };
}
