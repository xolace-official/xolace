import {
	fixtureSteadiness,
	fixtureUnlit,
	type ScoreFixture,
	ST_NOW,
} from "@/features/you/steadiness/dev/steadiness-fixtures";
import {
	SteadinessProvider,
	type SteadinessScreenData,
} from "@/features/you/steadiness/steadiness-data";
import { dialOf, partsOf } from "@/features/you/steadiness/steadiness-model";
import { SteadinessScreen } from "@/features/you/steadiness/steadiness-screen";
import {
	type SteadinessStart,
	SteadinessUiProvider,
} from "@/features/you/steadiness/steadiness-ui";

const noop = () => undefined;

export function FixtureSteadiness({
	plus = true,
	bought = false,
	score = 68,
	unlit = false,
	start,
}: {
	plus?: boolean;
	bought?: boolean;
	score?: ScoreFixture;
	unlit?: boolean;
	start?: SteadinessStart;
}) {
	const view = unlit ? fixtureUnlit() : fixtureSteadiness({ plus, score });
	const value: SteadinessScreenData = {
		actions: {
			faceInfo: noop,
			kindling: noop,
			numbers: noop,
			upsell: noop,
			upsellSeen: noop,
		},
		state: {
			dial: dialOf(view, plus, ST_NOW),
			doors: !(plus || bought),
			now: ST_NOW,
			parts: partsOf(view, plus, ST_NOW),
			plus,
			upsell: view.upsell && !bought ? { domain: view.upsell.domain } : null,
		},
	};
	return (
		<SteadinessProvider value={value}>
			<SteadinessUiProvider start={start}>
				<SteadinessScreen />
			</SteadinessUiProvider>
		</SteadinessProvider>
	);
}
