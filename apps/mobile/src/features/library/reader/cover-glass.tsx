import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const GLASS = isLiquidGlassAvailable();
// Sized to the button so every touch inside the circle lands on the glass (its press swell).
const COVER_GLASS = {
	alignItems: "center",
	borderCurve: "continuous",
	borderRadius: 20,
	height: 40,
	justifyContent: "center",
	overflow: "visible",
	width: 40,
} as const;

/** A round control on the cover photo. With glass, its own press response replaces the opacity dip. */
export const COVER_BUTTON = cn(
	"h-10 w-10 items-center justify-center rounded-full",
	!GLASS && "bg-cover-scrim/30 active:opacity-60"
);

/** Fixed palette over the photo: dark clear glass (white cover ink), not the themed GlassSurface. Wraps the button's icon. */
export function CoverGlass({ children }: { children: ReactNode }) {
	if (!GLASS) {
		return <>{children}</>;
	}
	return (
		<GlassView
			colorScheme="dark"
			glassEffectStyle="clear"
			isInteractive
			style={COVER_GLASS}
		>
			{children}
		</GlassView>
	);
}
