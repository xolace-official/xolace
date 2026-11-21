import { useThemeColor } from "heroui-native";

export function useTokenColor(token: string): string {
	return (useThemeColor as (t: string) => string)(token);
}

export function useTokenColors(tokens: readonly string[]): string[] {
	return (useThemeColor as (t: string[]) => string[])([...tokens]);
}
