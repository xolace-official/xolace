/** Sit with this on fixtures: the real screen and run under a provider filled from
 * the catalogue fixtures. Done and Close go back; "Something different" opens the
 * sheet's own dev state (a dev state always opens pushed, so it can't be the form
 * sheet), and the exercise behind it waits, as it does in the app. */
import { router } from "expo-router";
import { ScopedTheme } from "uniwind";
import { useSessionMode } from "@/context/session-mode-context";
import { NIGHT_VARIANT, type ThemeMode, themeVariant } from "@/design/themes";
import type { RunStart, SitScene } from "../run/sit-run";
import { type Sit, SitProvider } from "../sit-data";
import {
	type CatalogueExercise,
	type SitFrom,
	type Slots,
	toExercise,
} from "../sit-model";
import { SitWithThisScreen } from "../sit-with-this-screen";
import { LET_IT_LAND, REFLECT_SLOTS } from "./fixtures";

const ACTIONS: Sit["actions"] = {
	finish: () => router.back(),
	openSwap: () => router.push("/dev/sit-with-this/swap-sheet"),
};

type Props = {
	exercise?: CatalogueExercise;
	slots?: Slots;
	from?: SitFrom;
	swaps?: number;
	/** The night window; by default, as the app has it now. */
	late?: boolean;
	status?: Sit["state"]["status"];
	scene?: SitScene;
	/**
	 * Draw in Default's light or dark (late: night mode's theme), whatever the
	 * app's theme is, so each still can sit beside the board's render.
	 */
	theme?: ThemeMode;
};

function FixtureSit({
	exercise = LET_IT_LAND,
	slots = REFLECT_SLOTS,
	from = "reflect",
	swaps = 0,
	late,
	status = "ready",
	scene,
	theme,
}: Props) {
	const { isNight } = useSessionMode();
	const state: Sit["state"] = {
		exercise: status === "ready" ? toExercise(exercise, slots) : null,
		from,
		late: late ?? isNight,
		status,
		swaps,
	};
	const screen = (
		<SitProvider value={{ actions: ACTIONS, state }}>
			<SitWithThisScreen scene={scene} />
		</SitProvider>
	);
	if (!theme) {
		return screen;
	}
	return (
		<ScopedTheme
			theme={state.late ? NIGHT_VARIANT : themeVariant("default", theme)}
		>
			{screen}
		</ScopedTheme>
	);
}

/** The real route draws its own chrome: no header, no swipe back. */
const OWN = { gestureEnabled: false, headerShown: false };

/** A dev state's options and screen, spread into its entry next to its `id` and `title`. */
const state = (props: Props) => ({
	options: OWN,
	Screen: () => <FixtureSit {...props} />,
});

type Still = {
	late?: boolean;
	exercise?: CatalogueExercise;
	/** Default's light by day, night mode's theme late; "dark" for Default's dark by day. */
	theme?: ThemeMode;
	/** Held with the paused look. */
	paused?: boolean;
	/** As Reduce Motion draws it. */
	reduced?: boolean;
};

const look = ({ late = false, exercise, theme }: Still): Props => ({
	exercise,
	late,
	theme: theme ?? (late ? "dark" : "light"),
});

/** Beat `beat` of an exercise, `seek` ms in, held there. */
export const still = (beat: number, seek: number, extra: Still = {}) =>
	state({
		...look(extra),
		// Several seconds in, so "Something different" has had its 3 s.
		scene: {
			at: { beat, linkOn: true, paused: extra.paused, seek, stage: "play" },
			hold: true,
			reduced: extra.reduced,
		},
	});

/** A moment that plays on from there. */
export const live = (at: RunStart["at"], extra: Still = {}) =>
	state({ ...look(extra), scene: { at } });

/** An exercise from its first screen, in the app's own theme and hour (or other props). */
export const play = (props: Props) => state(props);
