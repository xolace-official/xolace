/** Intake v2, "Talk to Flux" (#704, #707): the `intake-v2` arm's whole intake after the
 * founder letter. Forward-only, like v1's questionnaire: a cold kill restarts at the letter. */
import { suggestHandle } from "@/features/intake/answer-rules";
import { IntakeBlank } from "@/features/intake/questionnaire/intake-screen";
import { IntakeV2Flow } from "@/features/intake/v2/intake-v2-flow";
import { useFullContext } from "@/lib/convex/use-full-context";

export default function IntakeFlux() {
	// Held until the query answers so a saved name is never replaced by a suggestion.
	const context = useFullContext();
	if (context === undefined) {
		return <IntakeBlank />;
	}
	return (
		<IntakeV2Flow
			initialName={context.preferences?.displayName || suggestHandle()}
		/>
	);
}
