import { useTokenColors } from "@/lib/use-token-color";

/** The fire's colours as Skia draws them, from `global.css`'s `first-run-*` tokens. */
export type FireInk = {
	coal: readonly string[];
	emberFlare: string;
	ground: string;
	ripple: string;
	seatGlow: readonly string[];
	spark: string;
	sparkGlow: string;
};

const TOKENS = [
	"first-run-coal-1",
	"first-run-coal-2",
	"first-run-coal-3",
	"first-run-ember-flare",
	"first-run-ground",
	"first-run-ripple",
	"first-run-seat-glow-1",
	"first-run-seat-glow-2",
	"first-run-spark",
	"first-run-spark-glow",
] as const;

/** Read once per canvas and handed to the draw worklets, which run on the UI thread. */
export function useFireInk(): FireInk {
	const [
		coal1,
		coal2,
		coal3,
		emberFlare,
		ground,
		ripple,
		glow1,
		glow2,
		spark,
		sparkGlow,
	] = useTokenColors(TOKENS);
	return {
		// The coal's white-hot core holds for its first two stops.
		coal: [coal1, coal1, coal2, coal3],
		emberFlare,
		ground,
		ripple,
		seatGlow: [glow1, glow2],
		spark,
		sparkGlow,
	};
}
