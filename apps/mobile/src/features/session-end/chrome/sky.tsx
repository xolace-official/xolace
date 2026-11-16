import { LinearGradient } from "@/components/shared/styled";
import { useScheme } from "@/design/scheme";
import { useBoardY } from "../board-y";
import type { SessionColors, Tone } from "../session-colors";

/** Reflect's `.rsky` stops; the session end draws it at .38 of Reflect's .6. */
const STOPS = {
	day: [0, 0.38, 0.62, 1],
	late: [0, 0.45, 1],
} as const;
const OPACITY = { day: 0.38, late: 1 } as const;
/** On a dark theme the evening light is a faint wash, not a near-white glow. */
const DARK_OPACITY = 0.14 * (0.38 / 0.6);
const HEIGHT = 300;

/** The evening sky's last light at the top of the page (late: dusk, opaque). */
export function SessionSky({
	tone,
	colors,
}: {
	tone: Tone;
	colors: SessionColors;
}) {
	const y = useBoardY();
	const dark = useScheme() === "dark";
	const opacity = tone === "day" && dark ? DARK_OPACITY : OPACITY[tone];
	return (
		<LinearGradient
			className="absolute inset-x-0 top-0"
			colors={colors.sky as [string, string, ...string[]]}
			locations={[...STOPS[tone]] as [number, number, ...number[]]}
			pointerEvents="none"
			style={{ height: y(HEIGHT), opacity }}
		/>
	);
}
