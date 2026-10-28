/** Step 4b, the real paywall; dismiss and purchase both run intake's terminal step since intake
 * has no back edge. */
import { useIntakeComplete } from "@/features/intake/use-intake-complete";
import { PaywallScreen } from "@/features/purchases/screens/paywall-screen";
import { useCompanionName } from "@/features/talk/use-companion-name";

export default function IntakePlans() {
	const completeIntake = useIntakeComplete();
	const companionName = useCompanionName();

	return (
		<PaywallScreen
			companionName={companionName}
			// Returned, not fire-and-forget: `false` unlatches the paywall's exit guard.
			onExit={(reason) =>
				completeIntake(
					reason === "purchased" ? "purchased" : "dismissed_paywall"
				)
			}
			surface="intake"
		/>
	);
}
