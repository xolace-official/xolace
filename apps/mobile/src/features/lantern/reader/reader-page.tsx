import type { ReactNode } from "react";
import {
	ScopedTheme,
	ScopedVariables,
	useCSSVariable,
	useUniwind,
} from "uniwind";
import type { ReaderPage } from "@/features/lantern/reader/reading-modes";

/** The theme roles a reading page sets, and its token for each (`--color-reader-<page>-*`). */
const ROLES = [
	["background", "bg"],
	["foreground", "ink"],
	["muted", "muted"],
	["subtle", "subtle"],
	["surface", "card"],
	["surface-secondary", "well"],
	["separator", "line"],
	["border", "line"],
	["accent", "accent"],
	["accent-foreground", "on-accent"],
] as const;

/**
 * A reading mode's page, reader-local (#401): the light or dark base theme with the roles above
 * swapped for the page's printed colours, so the reader's parts draw with plain classes
 * (`bg-surface-secondary`, `text-muted`) whatever the mode. Classic is the app's own theme.
 */
export function ReaderPageScope({
	page,
	children,
}: {
	page: ReaderPage;
	children: ReactNode;
}) {
	// Classic has no page tokens; read paper's so the hook still runs.
	const key = page === "app" ? "paper" : page;
	const values = (
		useCSSVariable(
			ROLES.map(([, token]) => `--color-reader-${key}-${token}`)
		) as string[]
	).map(String);
	const { theme } = useUniwind();
	// One shape for every page, so changing the mode never remounts the reader (its scroll and
	// its place would go): Classic is the app's own theme with nothing swapped.
	const variables: Record<string, string> = {};
	if (page !== "app") {
		ROLES.forEach(([role], i) => {
			// Classes resolve through `--<role>`, hooks through `--color-<role>`: both move.
			variables[`--${role}`] = values[i];
			variables[`--color-${role}`] = values[i];
		});
	}
	const scope = page === "app" ? theme : page === "night" ? "dark" : "light";
	return (
		<ScopedTheme theme={scope}>
			<ScopedVariables variables={variables}>{children}</ScopedVariables>
		</ScopedTheme>
	);
}
