import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	type CSSAnimationProperties,
	css,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { BODY_MAX_SCALE } from "@/design/type";
import { cn } from "@/lib/cn";

/**
 * Live captions, word by word (after the streaming-text sample's `Words`). Each word is its
 * own view in a wrapping row and fades in on a Reanimated CSS animation whose delay is
 * worked out once, when the word mounts. Nothing runs per frame on the JS side.
 *
 * Only Xolace's voice in Talk streams like this. Text people write (Connect, letters) never
 * does.
 */

/** A word fades in over 360 ms: about two of the companion's words are fading at once. */
const CAPTION_FADE_MS = 360;
/** The companion's words land ember and settle to ink: held for a third, then gone by 900 ms. */
const CAPTION_TRAIL_MS = 900;
/**
 * Speech arrives in bursts: a burst's words are spread at the speaker's word step after
 * whatever is still to show, but never more than this far behind what was heard. A big
 * burst plays faster rather than lagging.
 */
const CAPTION_MAX_LAG_MS = 1000;
/** The companion's words land about 190 ms apart, yours 240 (the board's script). */
export const WORD_STEP_MS = { companion: 190, person: 240 } as const;

const FADE: CSSAnimationProperties = {
	animationDuration: CAPTION_FADE_MS,
	animationFillMode: "both",
	animationName: css.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } }),
	animationTimingFunction: "ease-out",
};
const TRAIL: CSSAnimationProperties = {
	animationDuration: CAPTION_TRAIL_MS,
	animationFillMode: "both",
	animationName: css.keyframes({
		"0%": { opacity: 1 },
		"35%": { opacity: 1 },
		"100%": { opacity: 0 },
	}),
	animationTimingFunction: "ease-in-out",
};

/** A burst of words: from word `from`, heard at `at`, shown one every `interval` ms from `start`. */
type Run = { from: number; at: number; start: number; interval: number };
type Pace = { scheduled: number; end: number; runs: Run[] };
const NO_PACE: Pace = { end: 0, runs: [], scheduled: 0 };

function pace(p: Pace, available: number, stepMs: number, at: number): Pace {
	if (available <= p.scheduled) {
		return {
			...p,
			runs: p.runs.filter((r) => r.from < available),
			scheduled: available,
		};
	}
	const count = available - p.scheduled;
	const start = Math.max(at, p.end);
	const end = Math.max(
		start,
		Math.min(start + count * stepMs, at + CAPTION_MAX_LAG_MS)
	);
	return {
		end,
		runs: [
			...p.runs,
			{ at, from: p.scheduled, interval: (end - start) / count, start },
		],
		scheduled: available,
	};
}

/** A word's delay from when its burst was heard (it mounts in that same render). */
function delayOf(runs: Run[], id: number): number | null {
	const run = runs.findLast((r) => r.from <= id);
	return run ? run.start - run.at + (id - run.from) * run.interval : null;
}

const WORD = "text-[16px] leading-[24px]";
/**
 * Each word carries its trailing space, which plain text drops at a line's end; the word
 * row is this much wider than the text it lies over, so its lines break where the text's
 * do. About 0.4 em: more than a space, less than a space and the narrowest word.
 */
const SPACE_SLACK = 6.4;

function Word({
	text,
	runs,
	id,
	trail,
	reduced,
}: {
	text: string;
	runs: Run[];
	id: number;
	trail: boolean;
	reduced: boolean;
}) {
	const [delay] = useState(() => (reduced ? null : delayOf(runs, id)));
	return (
		<Animated.View
			style={delay === null ? undefined : { ...FADE, animationDelay: delay }}
		>
			<AppText className={WORD} variant="subhead">
				{text}{" "}
			</AppText>
			{trail && delay !== null ? (
				<Animated.View
					className="absolute inset-0"
					style={{ ...TRAIL, animationDelay: delay }}
				>
					<AppText className={WORD} color="emberInk" variant="subhead">
						{text}{" "}
					</AppText>
				</Animated.View>
			) : null}
		</Animated.View>
	);
}

type Props = {
	text: string;
	/** The speaker's word step (`WORD_STEP_MS`). */
	stepMs: number;
	/** The ember trail: the companion's lines only. */
	trail: boolean;
	reduced: boolean;
};

/**
 * A live line's words. An invisible copy of the plain text sizes the bubble (a wrapping row
 * in a bubble that shrinks to fit can wrap too early), and the words lie over it. VoiceOver
 * reads the bubble's label, not these. A burst is stamped when it arrives.
 */
export function CaptionWords({ text, stepMs, trail, reduced }: Props) {
	const { fontScale } = useWindowDimensions();
	const words = text.split(" ").filter(Boolean);
	const [p, setP] = useState(NO_PACE);
	// New words in: schedule them before they mount (React's "state from props" pattern).
	if (words.length !== p.scheduled) {
		setP(pace(p, words.length, stepMs, performance.now()));
	}
	if (words.length === 0) {
		return (
			<AppText className={WORD} variant="subhead">
				…
			</AppText>
		);
	}
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			<AppText className={cn(WORD, "opacity-0")} variant="subhead">
				{words.join(" ")}
			</AppText>
			<View
				className="absolute top-0 left-0 flex-row flex-wrap"
				style={{ right: -SPACE_SLACK * Math.min(fontScale, BODY_MAX_SCALE) }}
			>
				{words.map((w, i) => (
					<Word
						id={i}
						// A word's place in the line is its identity: the line only grows.
						key={i}
						reduced={reduced}
						runs={p.runs}
						text={w}
						trail={trail}
					/>
				))}
			</View>
		</View>
	);
}
