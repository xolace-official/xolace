import type { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

export type CrossPlatformSymbol = Exclude<
	ComponentProps<typeof SymbolView>["name"],
	string
>;
