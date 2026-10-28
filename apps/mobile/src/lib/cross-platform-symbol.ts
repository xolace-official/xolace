import type { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

/**
 * A SymbolView `name` that spells out every platform, so an icon can't fall
 * back to an iOS-only SF Symbol string on Android or web.
 */
export type CrossPlatformSymbol = Exclude<
	ComponentProps<typeof SymbolView>["name"],
	string
>;
