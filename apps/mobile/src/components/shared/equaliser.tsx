import { View } from "react-native";
import { EaseView } from "@/design/ease";
import { loopOrSettle, rest, useLoopRun } from "@/design/ease-loops";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** native-cook's `EqualiserBar`, as the boards draw it: four bars on their own slow loops. */
const BAR = { gap: 2.5, h: 16, r: 1.5, w: 3 } as const;
const LOW = 0.38;
/** Each bar's full cycle, in ms; their different lengths keep them out of step. */
const PERIODS = [2200, 1900, 2500, 2050] as const;
/** Reduce Motion: still bars at rising heights, never all flat. */
const STILL = [0.5, 0.625, 0.75, 0.875] as const;

/**
 * The playing mark (Lantern's hub listen; Explore and the player next): bars that rise and fall
 * while `playing`. One Ease loop per bar, so nothing runs per frame; every other bar starts high,
 * so they never move together. When `playing` turns false each bar eases back to rest and its
 * loop stops. `className` colours the bars (white by default, for art).
 */
export function Equaliser({
	playing,
	className,
}: {
	playing: boolean;
	className?: string;
}) {
	const reduced = useEffectiveReducedMotion();
	return (
		<View
			accessibilityElementsHidden
			className="flex-row items-center"
			importantForAccessibility="no-hide-descendants"
			style={{ gap: BAR.gap, height: BAR.h }}
		>
			{PERIODS.map((periodMs, i) => (
				<Bar
					className={className}
					index={i}
					key={periodMs}
					periodMs={periodMs}
					playing={playing}
					reduced={reduced}
				/>
			))}
		</View>
	);
}

function Bar({
	index,
	periodMs,
	playing,
	reduced,
	className,
}: {
	index: number;
	periodMs: number;
	playing: boolean;
	reduced: boolean;
	className?: string;
}) {
	const [low, high] = index % 2 === 0 ? [LOW, 1] : [1, LOW];
	const running = playing && !reduced;
	// A loop restarts only on remount: the key moves each time it starts again.
	const run = useLoopRun(running, periodMs);
	const ease = reduced
		? rest({ scaleY: STILL[index] })
		: loopOrSettle({
				from: { scaleY: low },
				periodMs,
				reduced,
				running,
				to: { scaleY: high },
			});
	return (
		<EaseView
			className={cn("bg-cover-ink", className)}
			key={run}
			style={{ borderRadius: BAR.r, height: BAR.h, width: BAR.w }}
			{...ease}
		/>
	);
}
