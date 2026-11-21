import { ScopedTheme } from "uniwind";
import { NIGHT_VARIANT, type ThemeMode, themeVariant } from "@/design/themes";
import { ReflectProvider } from "../reflect-data";
import { ReflectScreen } from "../reflect-screen";
import { type FixtureState, useFixtureReflect } from "./use-fixture-reflect";

export type FixtureProps = Partial<FixtureState> & {
	theme?: ThemeMode;
};

function FixtureReflect({ theme = "light", ...initial }: FixtureProps) {
	const value = useFixtureReflect(initial);
	return (
		<ScopedTheme
			theme={initial.late ? NIGHT_VARIANT : themeVariant("default", theme)}
		>
			<ReflectProvider value={value}>
				<ReflectScreen />
			</ReflectProvider>
		</ScopedTheme>
	);
}

const OWN = { headerShown: false };

export function reflect(props: FixtureProps) {
	return { options: OWN, Screen: () => <FixtureReflect {...props} /> };
}
