import { SymbolView } from 'expo-symbols';

type Props = {
  size?: number;
  color?: string;
};

// Apple's own `apple.logo` SF Symbol — licensed for Sign in with Apple use,
// unmodified. Replaces the hand-drawn SVG in apple-icon.tsx (Android/web).
export const AppleIcon = ({ size = 20, color }: Props) => (
  <SymbolView name="apple.logo" size={size} tintColor={color} />
);
