/** The Steadiness screen on fixtures: `xolace://dev/you/<id>` (P/design/handoff/steadiness.md §8). */
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DevState } from "@/dev/dev-state";
import { FixtureSteadiness } from "@/features/you/steadiness/dev/fixture-steadiness";
import { FaceSheet } from "@/features/you/steadiness/face-sheet";

/** In the app the face sheet is a form sheet; here, a page that starts under the bar. */
const UNDER_BAR = 44;
function FaceSheetPage() {
	const { top } = useSafeAreaInsets();
	return (
		<View className="flex-1 bg-surface" style={{ paddingTop: top + UNDER_BAR }}>
			<FaceSheet />
		</View>
	);
}

/** The screen sets its own header (the title that becomes the chip). */
const OPTIONS = { headerTransparent: true, title: "" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "steadiness-top",
		options: OPTIONS,
		Screen: () => <FixtureSteadiness />,
		title: "Steadiness at the top (Xolace+, 68, +4)",
	},
	{
		id: "steadiness-scrolled",
		options: OPTIONS,
		Screen: () => <FixtureSteadiness start={{ toParts: true }} />,
		title: "Steadiness scrolled: the chip in the bar, the grid, Work's detail",
	},
	{
		id: "steadiness-health",
		options: OPTIONS,
		Screen: () => (
			<FixtureSteadiness start={{ picked: "health", toParts: true }} />
		),
		title: "Steadiness, Health picked",
	},
	{
		id: "steadiness-list",
		options: OPTIONS,
		Screen: () => <FixtureSteadiness start={{ toParts: true, view: "list" }} />,
		title: "Steadiness as a list",
	},
	{
		id: "steadiness-list-work",
		options: OPTIONS,
		Screen: () => (
			<FixtureSteadiness
				start={{ open: "work", toParts: true, view: "list" }}
			/>
		),
		title: "Steadiness as a list, Work open in place",
	},
	{
		id: "steadiness-screen-free",
		options: OPTIONS,
		Screen: () => <FixtureSteadiness plus={false} />,
		title: "Steadiness, free: the locked chip, Unlock numbers, the upsell line",
	},
	{
		id: "steadiness-free-work",
		options: OPTIONS,
		Screen: () => (
			<FixtureSteadiness plus={false} start={{ peek: "work", toParts: true }} />
		),
		title: "Steadiness, free, Work tapped: the locked detail",
	},
	{
		id: "steadiness-unlit",
		options: OPTIONS,
		Screen: () => <FixtureSteadiness plus={false} unlit />,
		title: "Steadiness, not lit yet (1 of 2 so far)",
	},
	{
		id: "steadiness-30",
		options: OPTIONS,
		Screen: () => <FixtureSteadiness score={30} />,
		title: "Steadiness at 30, down 6 (fit check)",
	},
	{
		id: "steadiness-100",
		options: OPTIONS,
		Screen: () => <FixtureSteadiness score={100} />,
		title: "Steadiness at 100, up 2 (fit check)",
	},
	{
		id: "steadiness-face",
		options: OPTIONS,
		Screen: FaceSheetPage,
		title: "Reading the face (the ⓘ sheet's content)",
	},
];
