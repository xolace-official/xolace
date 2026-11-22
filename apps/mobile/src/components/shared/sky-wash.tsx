import { LinearGradient } from "@/components/shared/styled";
import { useBoardY } from "@/design/board";
import { useScheme } from "@/design/scheme";
import { useTokenColor } from "@/lib/use-token-color";

const STOPS = { day: [0, 0.38, 0.62, 1], late: [0, 0.45, 1] } as const;
const HEIGHT = 300;
const DAY_OPACITY = 0.6;
const DARK_OPACITY = 0.14;

type Props = {
	late: boolean;
	scale?: number;
};

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
