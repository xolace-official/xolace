import { useThemeColor } from "heroui-native";

/**
 * heroui-native's `useThemeColor` type union only knows its built-in tokens,
 * so reading Xolace's custom tokens (ember, resonance, …) is a type error even
 * though they resolve fine at runtime. This thin wrapper accepts any token name
 * and returns the resolved hex string.
 *
 * See memory: custom JS-only tokens must live in `@theme static` to be emitted.
 */
export function useTokenColor(token: string): string {
  return (useThemeColor as (t: string) => string)(token);
}
