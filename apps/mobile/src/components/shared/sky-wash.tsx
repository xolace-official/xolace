import { LinearGradient } from "@/components/shared/styled";
import { useBoardY } from "@/design/board";
import { useScheme } from "@/design/scheme";
import { useTokenColor } from "@/lib/use-token-color";

/** Reflect's `.rsky` stops, by day and late. */
const STOPS = { day: [0, 0.38, 0.62, 1], late: [0, 0.45, 1] } as const;
/** Board points: the wash covers the top 300. */
const HEIGHT = 300;
/** Reflect's opacity by day; dusk is opaque. */
const DAY_OPACITY = 0.6;
/** On a dark theme the evening light is a faint wash, not a near-white glow. */
const DARK_OPACITY = 0.14;

type Props = {
	/** The night window: dusk instead of the evening's last light. */
	late: boolean;
	/** The day wash's strength as a share of Reflect's (After a session: .38 / .6). Late stays opaque. */
	scale?: number;
};

/**
 * The evening sky's last light over the top of the page (Reflect's `.rsky`):
 * Reflect, Sit with this, You're not alone and After a session draw it. Late,
 * the dusk sky, opaque.
 */
export function SkyWash({ late, scale = 1 }: Props) {
	const y = useBoardY();
	const dark = useScheme() === "dark";
	const evening = [
		useTokenColor("evening-sky-1"),
		useTokenColor("evening-sky-2"),
		useTokenColor("evening-sky-3"),
		useTokenColor("evening-sky-end"),
	] as const;
	const dusk = [
		useTokenColor("dusk-sky-1"),
		useTokenColor("dusk-sky-2"),
		useTokenColor("dusk-sky-end"),
	] as const;
	const day = (dark ? DARK_OPACITY : DAY_OPACITY) * scale;
	return (
		<LinearGradient
			className="absolute inset-x-0 top-0"
			colors={late ? dusk : evening}
			locations={late ? STOPS.late : STOPS.day}
			pointerEvents="none"
			style={{ height: y(HEIGHT), opacity: late ? 1 : day }}
		/>
	);
}
