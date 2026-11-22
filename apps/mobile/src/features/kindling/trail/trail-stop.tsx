import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { EaseView } from "@/design/ease";
import { loopOrSettle, useLoopRun } from "@/design/ease-loops";
import { cn } from "@/lib/cn";
import { COPY } from "../copy";
import { stopLabel, type TrailTwig, type TwigState } from "../kindling-model";
import { KMOTION } from "../kindling-motion";
import type { KindlingColours } from "./kindling-colours";
import { RING, StopDisc } from "./stop-disc";
import { CheckBadge, LABEL_W, StopLabel } from "./stop-label";
import { useStopMotion } from "./stop-motion";
import { CIRCLE, isRight } from "./trail-points";

const LABEL_GAP = 14;
const RING_CLASS = "absolute inset-0 rounded-full border-solid";
const HALO = 10;
const BREATH_FROM = { opacity: 0.12, scale: 0.94 };
const BREATH_TO = { opacity: 0.26, scale: 1.06 };

type Props = {
	twig: TrailTwig;
	index: number;
	total: number;
	x: number;
	y: number;
	state: TwigState;
	open: boolean;
	dim: boolean;
	suggested: boolean;
	reduced: boolean;
	live: boolean;
	c: KindlingColours;
	onPress: (i: number) => void;
};

export function TrailStop({
	twig,
	index,
	total,
	x,
	y,
	state,
	open,
	dim,
	suggested,
	reduced,
	live,
	c,
	onPress,
}: Props) {
	const right = isRight(index);
	const done = state === "done";
	const passed = state === "passed" || state === "undo";
	const m = useStopMotion(state, open, dim, reduced);
	const breathing = live && open && !done;
	const run = useLoopRun(breathing, KMOTION.haloMs);

	let eyebrow = twig.trailEyebrow;
	let eyebrowColor = c.ink3;
	if (done) {
		eyebrow = COPY.tended;
		eyebrowColor = c.emberInk;
	} else if (passed) {
		eyebrow = COPY.passed;
	}
	if (open) {
		eyebrowColor = c.violet;
	}

	return (
		<Pressable
			accessibilityLabel={stopLabel(twig, index, total, state, suggested)}
			accessibilityRole="button"
			accessibilityState={{ selected: open }}
			className={cn(
				"absolute items-center",
				right ? "flex-row-reverse" : "flex-row"
			)}
			onPress={() => onPress(index)}
			style={{
				gap: LABEL_GAP,
				height: CIRCLE,
				left: right
					? x + CIRCLE / 2 - CIRCLE - LABEL_GAP - LABEL_W
					: x - CIRCLE / 2,
				top: y - CIRCLE / 2,
			}}
		>
			<Animated.View style={[{ height: CIRCLE, width: CIRCLE }, m.scale]}>
				<Animated.View
					className="absolute rounded-full bg-ember"
					style={[{ inset: -HALO }, m.emberHalo]}
				/>
				<Animated.View
					className="absolute"
					style={[{ inset: -HALO }, m.violetHalo]}
				>
					<EaseView
						className="flex-1 rounded-full bg-accent"
						key={run}
						{...loopOrSettle({
							from: BREATH_FROM,
							periodMs: KMOTION.haloMs,
							reduced,
							running: breathing,
							to: BREATH_TO,
						})}
					/>
				</Animated.View>
				<StopDisc
					alpha={m.alpha}
					kind={twig.kind}
					page={c.page}
					tint={c.tints[twig.tint]}
					tone={m.tone}
					veil={m.veil}
				/>
				<View
					className={cn(
						"absolute inset-0 rounded-full",
						passed ? "border-dashed" : "border-solid"
					)}
					style={{ borderColor: passed ? c.ink3 : c.rim, borderWidth: RING }}
				/>
				{passed ? null : (
					<>
						<Animated.View
							className={RING_CLASS}
							style={[
								{ borderColor: c.violet, borderWidth: RING },
								m.violetRing,
							]}
						/>
						<Animated.View
							className={RING_CLASS}
							style={[{ borderColor: c.ember, borderWidth: RING }, m.emberRing]}
						/>
					</>
				)}
				<CheckBadge onEmber={c.onEmber} right={right} scale={m.badge} />
			</Animated.View>
			<View>
				<StopLabel
					eyebrow={eyebrow}
					eyebrowColor={eyebrowColor}
					label={m.label}
					page={c.page}
					reduced={reduced}
					right={right}
					title={twig.title}
				/>
			</View>
		</Pressable>
	);
}
