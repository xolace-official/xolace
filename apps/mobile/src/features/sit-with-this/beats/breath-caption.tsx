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
