import type { SessionEnd } from "../session-end-data";
import { FixtureScreen } from "./fixture-screen";
import { UNLOCK, UPSELL, XOLACER } from "./fixtures";

/** Where the board's moment-two renders sit on the slider (as in `states.tsx`): a steady answer. */
const A_LITTLE_LIGHTER = 0.62;

/** C2's next cards (session-end-extras.md), at moment 2 after a steady answer. */
function ExtrasScreen({ state }: { state: SessionEnd["state"] }) {
	return (
		<FixtureScreen
			scene={{ moment: 2, position: A_LITTLE_LIGHTER }}
			state={state}
		/>
	);
}

export const XolacerSuggestion = () => <ExtrasScreen state={XOLACER} />;

export const PartInFocus = () => <ExtrasScreen state={UNLOCK} />;

export const InsightsUpsell = () => <ExtrasScreen state={UPSELL} />;
