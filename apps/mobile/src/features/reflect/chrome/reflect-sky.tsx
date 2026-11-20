import { LinearGradient } from "@/components/shared/styled";
import { useScheme } from "@/design/scheme";
import { useTokenColors } from "@/lib/use-token-color";
import { useBoardY } from "../layout";

const SKY = {
	evening: {
		locations: [0, 0.38, 0.62, 1],
		opacity: 0.6,
		tokens: [
			"reflect-sky-1",
			"reflect-sky-2",
			"reflect-sky-3",
			"reflect-sky-4",
		],
	},
	late: {
		locations: [0, 0.45, 1],
		opacity: 1,
		tokens: ["reflect-sky-late-1", "reflect-sky-late-2", "reflect-sky-late-3"],
	},
} as const;
const EVENING_DARK_OPACITY = 0.14;
const HEIGHT = 300;

export function ReflectSky({ late }: { late: boolean }) {
	const y = useBoardY();
	const dark = useScheme() === "dark";
	const sky = late ? SKY.late : SKY.evening;
	const colors = useTokenColors(sky.tokens);
	const opacity = !late && dark ? EVENING_DARK_OPACITY : sky.opacity;
	return (
		<LinearGradient
			className="absolute inset-x-0 top-0"
			colors={colors as [string, string, ...string[]]}
			locations={[...sky.locations] as [number, number, ...number[]]}
			pointerEvents="none"
			style={{ height: y(HEIGHT), opacity }}
		/>
	);
}
