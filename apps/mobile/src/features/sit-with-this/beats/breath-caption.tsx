import { useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedReaction,
	useAnimatedStyle,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { FONTS } from "@/design/type";
import { riseOf } from "../clock/phases";
import type { SitClock } from "../clock/use-sit-clock";
import { SoftCopy } from "../soft-copy";

/** Board `.cap`: Newsreader italic 21/1.38, ink2; `.cap.sync`: 24, ink. */
const CAPTION = {
	fontFamily: FONTS.mirror,
	fontSize: 21,
	lineHeight: 28.98,
} as const;
const SYNC = {
	fontFamily: FONTS.mirror,
	fontSize: 24,
	lineHeight: 33.12,
} as const;
const LEAVE_RISE = 6;

type Props = {
	text: string | readonly [string, string];
	sync: boolean;
	serial: number;
	clock: SitClock;
	reduced: boolean;
};

/**
 * A breath beat's caption, one line per phase (fix: production shows both of
 * Make room's lines at once): the in-line on the inhale, the out-line on the
 * exhale. Both are stacked and the clock picks one and rises it, so the
 * caption changes in the same frame as the phase. It leaves with the beat.
 * VoiceOver reaches only the line that's up (one small render per phase, for
 * Make room's two lines only).
 */
export function BreathCaption({ text, sync, serial, clock, reduced }: Props) {
	const lines = typeof text === "string" ? [text] : [...text];
	const { leave, at } = clock;
	const out = useAnimatedStyle(() => {
		const k = at.get() === serial ? leave.get() : 0;
		return {
			opacity: 1 - k,
			transform: [{ translateY: reduced ? 0 : -LEAVE_RISE * k }],
		};
	});
	const [active, setActive] = useState(0);
	const split = lines.length > 1;
	useAnimatedReaction(
		() => (split && at.get() === serial ? clock.capIdx.get() : 0),
		(now, before) => {
			if (now !== before) {
				scheduleOnRN(setActive, now);
			}
		}
	);
	const type = sync ? SYNC : CAPTION;
	// The longest line holds the space, so the caption never reflows between phases.
	const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), "");
	return (
		<Animated.View style={out}>
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
			>
				<AppText center className="opacity-0" style={type} variant="body">
					{longest}
				</AppText>
			</View>
			{lines.map((line, i) => (
				<CaptionLine
					clock={clock}
					hidden={i !== active}
					index={i}
					key={line}
					reduced={reduced}
					serial={serial}
					sync={sync}
					text={line}
				/>
			))}
		</Animated.View>
	);
}

type LineProps = {
	text: string;
	/** Not the line that's up: VoiceOver skips it. */
	hidden: boolean;
	index: number;
	serial: number;
	clock: SitClock;
	reduced: boolean;
	sync: boolean;
};

function CaptionLine({
	text,
	hidden,
	index,
	serial,
	clock,
	reduced,
	sync,
}: LineProps) {
	const { at, capIdx, capE } = clock;
	const on = useAnimatedStyle(() => {
		const here = at.get() === serial && capIdx.get() === index;
		const r = riseOf(here ? capE.get() : 0, reduced);
		return {
			opacity: here ? r.opacity : 0,
			transform: [{ translateY: r.translateY }],
		};
	});
	const soft = useAnimatedStyle(() => {
		const here = at.get() === serial && capIdx.get() === index;
		return { opacity: here && !reduced ? 1 - capE.get() : 0 };
	});
	const type = sync ? SYNC : CAPTION;
	const color = sync ? "foreground" : "muted";
	return (
		<Animated.View
			accessibilityElementsHidden={hidden}
			className="absolute inset-0"
			importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
			style={on}
		>
			<AppText center color={color} style={type} variant="body">
				{text}
			</AppText>
			<SoftCopy
				color={color}
				soft={soft}
				style={type}
				text={text}
				variant="body"
			/>
		</Animated.View>
	);
}
