import type { ReactNode } from 'react';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { cn } from '@/src/lib/utils';

const GLASS = isLiquidGlassAvailable();
// Sized to the button so every touch inside the circle lands on the glass (its press swell).
const COVER_GLASS = {
  width: 40,
  height: 40,
  borderRadius: 20,
  borderCurve: 'continuous',
  overflow: 'visible',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

/** A round control on the cover photo. With glass, its own press response replaces the opacity dip. */
export const COVER_BUTTON = cn(
  'h-10 w-10 items-center justify-center rounded-full',
  !GLASS && 'bg-cover-scrim/30 active:opacity-60',
);

/** Fixed palette over the photo: dark clear glass (white cover ink), not the themed GlassSurface. Wraps the button's icon. */
export function CoverGlass({ children }: { children: ReactNode }) {
  if (!GLASS) return <>{children}</>;
  return (
    <GlassView glassEffectStyle="clear" colorScheme="dark" isInteractive style={COVER_GLASS}>
      {children}
    </GlassView>
  );
}
