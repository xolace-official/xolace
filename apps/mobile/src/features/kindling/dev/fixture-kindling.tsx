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

export const kindling = (props: Props) => ({
	options: { title: "Your kindling" },
	Screen: () => <Themed {...props} />,
});
