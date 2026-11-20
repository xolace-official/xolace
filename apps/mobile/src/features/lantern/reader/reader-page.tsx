import type { ReactNode } from "react";
import {
	ScopedTheme,
	ScopedVariables,
	useCSSVariable,
	useUniwind,
} from "uniwind";
import type { ReaderPage } from "@/features/lantern/reader/reading-modes";

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

export function ReaderPageScope({
	page,
	children,
}: {
	page: ReaderPage;
	children: ReactNode;
}) {
	const key = page === "app" ? "paper" : page;
	const values = (
		useCSSVariable(
			ROLES.map(([, token]) => `--color-reader-${key}-${token}`)
		) as string[]
	).map(String);
	const { theme } = useUniwind();
	const variables: Record<string, string> = {};
	if (page !== "app") {
		ROLES.forEach(([role], i) => {
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
