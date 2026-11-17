import { useThemeColor } from "heroui-native";

/** `useThemeColor` for any token name; heroui-native's union lacks Xolace's custom tokens.
 * JS-only tokens must live in `@theme static`. */
export function useTokenColor(token: string): string {
	return (useThemeColor as (t: string) => string)(token);
}

/** `useTokenColor` for a list of tokens of any length, in one hook call. */
export function useTokenColors(tokens: readonly string[]): string[] {
	return (useThemeColor as (t: string[]) => string[])([...tokens]);
}
