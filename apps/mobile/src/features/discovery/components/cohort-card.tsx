import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { TextAnimation } from "@/components/ui/text-animation";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { FluxStage, MOUTH_Y } from "./flux-stage";

const FLUX_W = 53;
const FLUX_H = 104;
/** Drops his feet below the bubble's baseline so he stands, not floats. */
const FLUX_TOP = 8;
const TAIL = 12;

const WORD_MS = 62;
/** Held after a comma or full stop. Without it, 62ms/word reads as a ticker. */
const BREATH_MS = 200;
/** Fade time of one word once it is its turn. */
const FADE_MS = 90;
/** Bubble arrival time. Words wait for it to land. */
const BUBBLE_MS = 420;
/** Lead-in before the first word. */
const OPENING_MS = BUBBLE_MS - 100;
/** Pause between the two beats. Said in one breath, the card reads as a statistic. */
const BEAT_MS = 900;
/** 0.55 overshoots enough to read as spoken; past ~0.8 the bubble arrives dead. */
const BUBBLE_SPRING = { dampingRatio: 0.55, duration: BUBBLE_MS } as const;
/** Slower, looser and further-travelling so the overshoot stays visible. */
const CLOSER_SPRING = { dampingRatio: 0.45, duration: 560 } as const;
const CLOSER_TRAVEL = 22;

const styles = StyleSheet.create({
	bubble: { borderCurve: "continuous" },
	flux: { marginTop: FLUX_TOP },
	// A rotated corner tucked behind the bubble's left edge so it inherits fill and
	// border; its top sits at Flux's mouth.
	tail: {
		height: TAIL,
		left: -5,
		position: "absolute",
		top: FLUX_TOP + FLUX_H * MOUTH_Y - TAIL / 2,
		transform: [{ rotate: "45deg" }],
		width: TAIL,
	},
});

/** Cumulative start time per word, with a beat held at punctuation. */
function wordOffsets(words: string[]) {
	let t = 0;
	return words.map((w) => {
		const at = t;
		t += WORD_MS + (/[,.]$/.test(w) ? BREATH_MS : 0);
		return at;
	});
}

const spokenMs = (text: string) => {
	const o = wordOffsets(text.split(" "));
	return o[o.length - 1] + WORD_MS;
};

// One UI-thread clock that every word's opacity reads from. Slicing the string
// per word would re-render and re-measure on a contended JS thread and stutter.
function useSpokenClock(total: number, reduced: boolean) {
	// The last word fades until total + FADE_MS; a clock stopping at total lands short.
	const end = total + FADE_MS;
	const clock = useSharedValue(reduced ? end : 0);

	useEffect(() => {
		if (reduced) {
			clock.set(end);
			return;
		}
		clock.set(0);
		clock.set(
			withDelay(
				OPENING_MS,
				withTiming(end, { duration: end, easing: Easing.linear })
			)
		);
	}, [clock, reduced, end]);

	return clock;
}

/** One word, lit when the clock reaches the moment he says it. */
function SpokenWord({
	clock,
	at,
	children,
}: {
	clock: SharedValue<number>;
	at: number;
	children: string;
}) {
	const style = useAnimatedStyle(() => ({
		opacity: interpolate(clock.get(), [at, at + FADE_MS], [0, 1], "clamp"),
	}));
	return <Animated.Text style={style}>{children}</Animated.Text>;
}

/** Bubbles arrive from the tail, not by fading in place. */
function useBubbleIn(
	delay: number,
	reduced: boolean,
	spring: { duration: number; dampingRatio: number } = BUBBLE_SPRING,
	travel = 10
) {
	const p = useSharedValue(reduced ? 1 : 0);
	useEffect(() => {
		if (reduced) {
			p.set(1);
			return;
		}
		p.set(withDelay(delay, withSpring(1, spring)));
	}, [delay, reduced, p, spring]);

	return useAnimatedStyle(() => ({
		// Opacity is clamped so the overshoot never flashes brighter than solid;
		// the transforms are not, so the bubble visibly travels past and comes back.
		opacity: Math.min(p.get(), 1),
		transform: [
			{ translateX: (1 - p.get()) * -travel },
			{ scale: 0.86 + p.get() * 0.14 },
		],
	}));
}

/** Weekly speech bubble from Flux: how many campers carried the viewer's last emotion, then
 * "You are not alone." Inert; renders nothing without an honest number (convex/cohort.ts). */
export function CohortCard() {
	const card = useQuery(api.cohort.getWeeklyCohortCard);
	const reduced = useEffectiveReducedMotion();

	if (!card || card.status === "hidden") {
		return null;
	}

	// Separate component so the timers and springs start when the card appears,
	// not at mount while the query is still in flight.
	return <CohortSpeech card={card} reduced={reduced} />;
}

type Card = FunctionReturnType<typeof api.cohort.getWeeklyCohortCard>;

function CohortSpeech({
	card,
	reduced,
}: {
	card: Exclude<Card, { status: "hidden" }>;
	reduced: boolean;
}) {
	const emotion = card.emotion.replace(/-/g, " ");
	const fact =
		card.status === "count"
			? `campers sat with ${emotion} by the fire this week.`
			: `Others have sat with ${emotion} by this fire too.`;
	const closer = "You are not alone.";

	const words = fact.split(" ");
	const offsets = wordOffsets(words);
	const said = spokenMs(fact);
	const bubble1 = useBubbleIn(0, reduced);
	const bubble2 = useBubbleIn(
		OPENING_MS + said + BEAT_MS,
		reduced,
		CLOSER_SPRING,
		CLOSER_TRAVEL
	);
	const clock = useSpokenClock(said, reduced);

	return (
		<View
			accessibilityLabel={`${card.status === "count" ? `${card.count} ` : ""}${fact} ${closer}`}
			accessibilityRole="text"
			accessible
			className="flex-row gap-1"
		>
			<View style={styles.flux}>
				<FluxStage h={FLUX_H} reduced={reduced} w={FLUX_W} />
			</View>

			<View className="flex-1 gap-2">
				<Animated.View style={bubble1}>
					<View
						className="rounded-3xl border border-border/65 bg-surface"
						style={styles.bubble}
					>
						<View
							className="border-border/65 border-b border-l bg-surface"
							style={styles.tail}
						/>
						<AppText className="px-4 py-4 text-[15px] text-foreground leading-6">
							{/* The count finishes with the last word of its sentence. */}
							{card.status === "count" && (
								<>
									<TextAnimation.Counting
										className="text-[15px] text-ember leading-6"
										delay={OPENING_MS}
										duration={said}
										enabled={!reduced}
										value={card.count}
										weight="semibold"
									/>
									<AppText> </AppText>
								</>
							)}
							{/* Offsets strictly increase, so they key repeated words safely. */}
							{words.map((word, i) => (
								<SpokenWord at={offsets[i]} clock={clock} key={offsets[i]}>
									{i === words.length - 1 ? word : `${word} `}
								</SpokenWord>
							))}
						</AppText>
					</View>
				</Animated.View>

				{/* No tail on the closer: it would cross the bubble above. */}
				<Animated.View className="self-start" style={bubble2}>
					<View
						className="rounded-3xl border border-border/60 bg-surface px-4 py-2.5"
						style={styles.bubble}
					>
						<AppText className="text-[14px] text-muted leading-5">
							{closer}
						</AppText>
					</View>
				</Animated.View>
			</View>
		</View>
	);
}
