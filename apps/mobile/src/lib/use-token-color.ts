import { useThemeColor } from "heroui-native";

/** `useThemeColor` for any token name; heroui-native's union lacks Xolace's custom tokens.
 * JS-only tokens must live in `@theme static`. */
export function useTokenColor(token: string): string {
	return (useThemeColor as (t: string) => string)(token);
}
