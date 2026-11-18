/** Step 4b, the real paywall; Continue free and a purchase both run intake's terminal step,
 * since intake has no back edge. */
import { useIntakeComplete } from "@/features/intake/use-intake-complete";
import { PlusData } from "@/features/plus/plus-data";
import { PlusScreen } from "@/features/plus/plus-screen";
import { useCompanionName } from "@/lib/talk/use-companion-name";

export default function IntakePlans() {
	const completeIntake = useIntakeComplete();
	const companionName = useCompanionName();

	return (
		<PlusData
			companionName={companionName}
			// Returned, not fire-and-forget: `false` unlatches the paywall's exit guard.
			onExit={(reason) =>
				completeIntake(
					reason === "purchased" ? "purchased" : "dismissed_paywall"
				)
			}
			surface="intake"
		>
			<PlusScreen />
		</PlusData>
	);
}
