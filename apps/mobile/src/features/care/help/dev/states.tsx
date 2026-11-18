/** Get help now on fixtures: `xolace://dev/care/<id>`. */
import type { DevState } from "@/dev/dev-state";
import { COPY } from "@/features/care/help/copy";
import { FixtureHelp } from "@/features/care/help/dev/fixture-help";
import {
	ELSEWHERE,
	GHANA,
	UNITED_STATES,
} from "@/features/care/help/dev/fixtures";

/** The real route's header (`crisis-resources/_layout.tsx`). */
const OPTIONS = { title: COPY.title };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "help-ghana",
		options: OPTIONS,
		Screen: () => <FixtureHelp choice={GHANA} />,
		title: "Get help now: Ghana, crisis lines and services",
	},
	{
		id: "help-united-states",
		options: OPTIONS,
		Screen: () => <FixtureHelp choice={UNITED_STATES} />,
		title: "Get help now: the US, with pages and an SMS line",
	},
	{
		id: "help-elsewhere",
		options: OPTIONS,
		Screen: () => <FixtureHelp choice={ELSEWHERE} />,
		title: "Get help now: a country the list doesn't cover",
	},
];
