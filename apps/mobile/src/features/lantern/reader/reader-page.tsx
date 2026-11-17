import type { ReactNode } from "react";
import { ScopedTheme, ScopedVariables, useCSSVariable } from "uniwind";
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
	if (page === "app") {
		return children;
	}
	const variables: Record<string, string> = {};
	ROLES.forEach(([role], i) => {
		// Classes resolve through `--<role>`, hooks through `--color-<role>`: both move.
		variables[`--${role}`] = values[i];
		variables[`--color-${role}`] = values[i];
	});
	return (
		<ScopedTheme theme={page === "night" ? "dark" : "light"}>
			<ScopedVariables variables={variables}>{children}</ScopedVariables>
		</ScopedTheme>
	);
}
