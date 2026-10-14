import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router/react-navigation';
import { usePostHog } from 'posthog-react-native';
import { usePlusEntitlement } from '@/src/features/purchases/use-plus-entitlement';
import { usePaywall } from '@/src/features/purchases/use-paywall';
import { useAppStore } from '@/src/store/store';

/** The one-time Plus dictation upsell's modal (#559). */
export type DictationUpsell = {
  isOpen: boolean;
  /** Closes it and dictates on device, so the tap that opened it isn't wasted. */
  onNotNow: () => void;
  onUpgrade: () => void;
  /** Closed without choosing: nothing starts. */
  onDismiss: () => void;
};

// Where the upsell's paywall round trip is: opened, then this screen blurs
// ('left'), then it's focused again.
type PaywallTrip = 'none' | 'opened' | 'left';

/**
 * A free person's first mic tap introduces Plus dictation instead of starting
 * (#559). `intercept` returns true when it took the tap. `start` is the mic's
 * own start, run on "Not now" and on returning from the paywall as Plus.
 */
export function useDictationUpsell(start: () => Promise<void>) {
  const { isPlus, isResolved } = usePlusEntitlement();
  const seen = useAppStore((s) => s.dictationUpsellSeen);
  const setSeen = useAppStore((s) => s.setDictationUpsellSeen);
  const openPaywall = usePaywall((s) => s.open);
  const posthog = usePostHog();
  const [isOpen, setIsOpen] = useState(false);
  const tripRef = useRef<PaywallTrip>('none');
  const isFocused = useIsFocused();

  // Back from the paywall: Plus now means a purchase, so the take they asked
  // for starts on Plus; still free means they cancelled, so nothing starts.
  const returnFromPaywall = useEffectEvent(() => {
    if (isPlus) void start();
  });

  useEffect(() => {
    if (!isFocused) {
      if (tripRef.current === 'opened') tripRef.current = 'left';
    } else if (tripRef.current === 'left') {
      tripRef.current = 'none';
      returnFromPaywall();
    }
  }, [isFocused]);

  const intercept = () => {
    // Only on a settled "free": a subscriber whose entitlement is still
    // loading must never see an upsell. Seen once it shows, however it closes.
    if (!isResolved || isPlus || seen) return false;
    setSeen(true);
    setIsOpen(true);
    posthog.capture('plus_upsell_shown', { surface: 'dictation' });
    return true;
  };

  const dictationUpsell: DictationUpsell = {
    isOpen,
    onNotNow: () => {
      setIsOpen(false);
      void start();
    },
    onUpgrade: () => {
      setIsOpen(false);
      posthog.capture('plus_upsell_tapped', { surface: 'dictation' });
      tripRef.current = 'opened';
      openPaywall('dictation');
    },
    onDismiss: () => setIsOpen(false),
  };

  return { dictationUpsell, intercept };
}
