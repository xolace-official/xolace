/** The You tab on fixtures: the real screen under providers the fixtures fill. Its own UI (the
 * freeze explanation, the week's ring, the tabs) still answers taps. */
import {
	fixtureYou,
	type YouFixture,
} from "@/features/you/home/dev/fixture-state";
import { YouProvider } from "@/features/you/home/you-data";
import { YouScreen } from "@/features/you/home/you-screen";
import { YouUiProvider, type YouUiStart } from "@/features/you/home/you-ui";

export function FixtureYou({
	fixture,
	start,
}: {
	fixture?: YouFixture;
	start?: YouUiStart;
}) {
	return (
		<YouProvider value={fixtureYou(fixture)}>
			<YouUiProvider start={start}>
				<YouScreen />
			</YouUiProvider>
		</YouProvider>
	);
}
