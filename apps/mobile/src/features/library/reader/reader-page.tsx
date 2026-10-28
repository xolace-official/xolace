import type { ReactNode } from "react";
import { ScopedTheme, ScopedVariables, useCSSVariable } from "uniwind";

import type { ReaderPage } from "./reading-mode";

/** A reading mode's page, reader-local (#401): the light/dark base theme with background /
 * foreground / muted swapped for the page's tokens. */
export function ReaderPageScope({
	page,
	children,
}: {
	page: ReaderPage;
	children: ReactNode;
}) {
	// Classic ('app') has no page tokens; read paper's so the hook still runs.
	const key = page === "app" ? "paper" : page;
	const [bg, ink, muted] = (
		useCSSVariable([
			`--color-reader-${key}-bg`,
			`--color-reader-${key}-ink`,
			`--color-reader-${key}-muted`,
		]) as string[]
	).map(String);
	if (page === "app") {
		return children;
	}
	return (
		<ScopedTheme theme={page === "night" ? "dark" : "light"}>
			{/* Class names resolve through `--background`, hooks through HeroUI's
			 * `--color-*` alias, so both are overridden. */}
			<ScopedVariables
				variables={{
					"--background": bg,
					"--color-background": bg,
					"--color-foreground": ink,
					"--color-muted": muted,
					"--foreground": ink,
					"--muted": muted,
				}}
			>
				{children}
			</ScopedVariables>
		</ScopedTheme>
	);
}
