/**
 * Step 4b — the real paywall, reached from "I'm ready" on the offer screen.
 *
 * The shared `PaywallScreen` unchanged: `offerings.current` as-is, both plans,
 * annual pre-selected with its 7-day trial, monthly left visible as the
 * discount anchor. Only the exit differs — both a dismiss and a completed
 * purchase run intake's terminal step rather than popping a modal, because
 * intake has no back edge to pop to.
 *
 * This is the screen that fires `paywall_opened{surface:"intake"}` and its
 * `paywall_dismissed` — on every other surface those mean "saw pricing" and
 * "left pricing", and the offer deck before this one carries no price. The deck
 * has its own pair, `intake_offer_opened` / `intake_offer_dismissed`; keeping
 * them apart is what keeps intake's dismissal rate inside [0, 1].
 */
import { useIntakeComplete } from '@/src/features/intake/use-intake-complete';
import { PaywallScreen } from '@/src/features/purchases/screens/paywall-screen';

export default function IntakePlans() {
  const completeIntake = useIntakeComplete();

  return (
    <PaywallScreen
      surface="intake"
      // Returned, not fire-and-forget: `false` (a swallowed write) is what
      // unlatches the paywall's single-flight exit guard.
      onExit={(reason) =>
        completeIntake(reason === 'purchased' ? 'purchased' : 'dismissed_paywall')
      }
    />
  );
}
