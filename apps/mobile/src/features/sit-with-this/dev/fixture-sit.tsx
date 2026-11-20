import { router } from "expo-router";
import { ScopedTheme } from "uniwind";
import { useSessionMode } from "@/context/session-mode-context";
import { NIGHT_VARIANT, type ThemeMode, themeVariant } from "@/design/themes";
import { toExercise } from "../catalogue";
import type { RunStart, SitScene } from "../run/sit-run";
import { type Sit, SitProvider } from "../sit-data";
import type { CatalogueExercise, SitFrom, Slots } from "../sit-model";
import { SitWithThisScreen } from "../sit-with-this-screen";
import { LET_IT_LAND, REFLECT_SLOTS } from "./fixtures";

const ACTIONS: Sit["actions"] = {
	begin: () => undefined,
	finish: () => router.back(),
	openSwap: () => router.push("/dev/sit-with-this/swap-sheet"),
};

type Props = {
	exercise?: CatalogueExercise;
	slots?: Slots;
	from?: SitFrom;
	swaps?: number;
	late?: boolean;
	status?: Sit["state"]["status"];
	scene?: SitScene;
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

const OWN = { gestureEnabled: false, headerShown: false };

const state = (props: Props) => ({
	options: OWN,
	Screen: () => <FixtureSit {...props} />,
});

type Still = {
	late?: boolean;
	exercise?: CatalogueExercise;
	theme?: ThemeMode;
	paused?: boolean;
	reduced?: boolean;
};

const look = ({ late = false, exercise, theme }: Still): Props => ({
	exercise,
	late,
	theme: theme ?? (late ? "dark" : "light"),
});

export const still = (beat: number, seek: number, extra: Still = {}) =>
	state({
		...look(extra),
		scene: {
			at: { beat, linkOn: true, paused: extra.paused, seek, stage: "play" },
			hold: true,
			reduced: extra.reduced,
		},
	});

export const live = (at: RunStart["at"], extra: Still = {}) =>
	state({ ...look(extra), scene: { at } });

export const play = (props: Props) => state(props);
