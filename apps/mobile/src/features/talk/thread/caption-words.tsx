import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	type CSSAnimationProperties,
	css,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { BODY_MAX_SCALE } from "@/design/type";
import { cn } from "@/lib/cn";

const CAPTION_FADE_MS = 360;
const CAPTION_TRAIL_MS = 900;
const CAPTION_MAX_LAG_MS = 1000;
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

function delayOf(runs: Run[], id: number): number | null {
	const run = runs.findLast((r) => r.from <= id);
	return run ? run.start - run.at + (id - run.from) * run.interval : null;
}

const WORD = "text-[16px] leading-[24px]";
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
	stepMs: number;
	trail: boolean;
	reduced: boolean;
};

export function CaptionWords({ text, stepMs, trail, reduced }: Props) {
	const { fontScale } = useWindowDimensions();
	const words = text.split(" ").filter(Boolean);
	const [p, setP] = useState(NO_PACE);
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
