import { SymbolView } from "expo-symbols";

type Props = {
	size?: number;
	color?: string;
};

// Apple's own `apple.logo` SF Symbol, licensed for Sign in with Apple when
// unmodified. apple-icon.tsx (Android/web) draws an SVG instead.
export const AppleIcon = ({ size = 20, color }: Props) => (
	<SymbolView name="apple.logo" size={size} tintColor={color} />
);
