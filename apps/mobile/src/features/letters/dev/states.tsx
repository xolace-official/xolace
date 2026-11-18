/** Letters on fixtures: `xolace://dev/letters/<id>`. */
import type { DevState } from "@/dev/dev-state";
import { PiecesScreen } from "./pieces-screen";

const OPTIONS = { title: "Letter pieces" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "pieces-day",
		options: OPTIONS,
		Screen: () => <PiecesScreen light="day" />,
		title: "The shared pieces, day (light themes)",
	},
	{
		id: "pieces-dusk",
		options: OPTIONS,
		Screen: () => <PiecesScreen light="dusk" />,
		title: "The shared pieces, dusk (dark themes)",
	},
	{
		id: "pieces-night",
		options: OPTIONS,
		Screen: () => <PiecesScreen light="night" />,
		title: "The shared pieces, night",
	},
];
