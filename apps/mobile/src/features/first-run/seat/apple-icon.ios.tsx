import { SymbolView } from "expo-symbols";

/** Apple's own `apple.logo` SF Symbol, licensed for Sign in with Apple when unmodified. */
export function AppleIcon({ size, color }: { size: number; color: string }) {
	return <SymbolView name="apple.logo" size={size} tintColor={color} />;
}
