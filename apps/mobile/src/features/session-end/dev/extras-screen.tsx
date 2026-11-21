import type { SessionEnd } from "../session-end-data";
import { FixtureScreen } from "./fixture-screen";
import { UNLOCK, UPSELL, XOLACER } from "./fixtures";

const A_LITTLE_LIGHTER = 0.62;

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
