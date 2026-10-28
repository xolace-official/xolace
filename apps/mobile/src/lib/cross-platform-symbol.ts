import type { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

/** A SymbolView `name` spelling out every platform, so an icon can't fall back to an iOS-only
 * SF Symbol on Android or web. */
export type CrossPlatformSymbol = Exclude<
	ComponentProps<typeof SymbolView>["name"],
	string
>;
