/** Your kindling on fixtures: the real screen under its provider, in Default's light or dark. */
import { ScopedTheme } from "uniwind";
import { type ThemeMode, themeVariant } from "@/design/themes";
import { KindlingProvider } from "../kindling-data";
import { KindlingScreen } from "../kindling-screen";
import { type FixtureProps, useFixtureKindling } from "./use-fixture-kindling";

type Props = FixtureProps & { theme?: ThemeMode };

function FixtureKindling(props: FixtureProps) {
	const value = useFixtureKindling(props);
	return (
		<KindlingProvider value={value}>
			<KindlingScreen />
		</KindlingProvider>
	);
}

function Themed({ theme = "dark", ...props }: Props) {
	return (
		<ScopedTheme theme={themeVariant("default", theme)}>
			<FixtureKindling {...props} />
		</ScopedTheme>
	);
}

/** A dev state's options and screen, spread into its entry next to its `id` and `title`. */
export const kindling = (props: Props) => ({
	options: { title: "Your kindling" },
	Screen: () => <Themed {...props} />,
});
