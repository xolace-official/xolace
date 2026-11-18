import type { ReactNode } from "react";
import type { StyleProp, TextInstance, ViewStyle } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import type { ArrivingBadge } from "@/features/achievements/arrival/arrival-model";
import {
	age,
	type Eng,
	type Geo,
	PH,
	RV,
	revealAt,
	shutAt,
} from "@/features/achievements/arrival/arrival-motion";
import { SparkCount } from "@/features/achievements/arrival/badge/spark-count";
import { COPY } from "@/features/achievements/copy";
import { cn } from "@/lib/cn";

/** The board's tops (844 pt phone); `geo.dy` shifts them by the status bar. */
const TOP = {
	eye: 150,
	line: 510,
	sparks: 574,
	title: 464,
} as const;
const RISE = 12;

/** Each badge's title, for VoiceOver focus as it comes out. */
export type TitleRef = (i: number) => (node: TextInstance | null) => void;

/** Badge `i`'s words: the eyebrow, the title, the line, the sparks counting up. */
export function BadgeWords({
	eng,
	i,
	b,
	total,
	geo,
	titleRef,
	ember,
}: {
	eng: SharedValue<Eng>;
	i: number;
	b: ArrivingBadge;
	total: number;
	geo: Geo;
	titleRef: TitleRef;
	ember: string;
}) {
	const top = (y: number) => ({ top: y + geo.dy });
	return (
		<>
			<Reveal
				at={RV.eye}
				className="inset-x-0"
				eng={eng}
				i={i}
				rise={0}
				style={top(TOP.eye)}
			>
				<AppText
					center
					className="text-[12px] leading-4 tracking-[1.68px]"
					style={{ color: ember }}
					variant="caption"
					weight="bold"
				>
					{COPY.arrival.eyebrow(total)}
				</AppText>
			</Reveal>
			<Reveal
				at={RV.title}
				className="inset-x-6"
				eng={eng}
				i={i}
				rise={RISE}
				style={top(TOP.title)}
			>
				<AppText
					accessibilityLabel={COPY.arrival.heading(b.title, b.copy, b.sparks)}
					accessibilityRole="header"
					center
					className="text-[30px] leading-9 tracking-[-0.45px]"
					ref={titleRef(i)}
					variant="title"
				>
					{b.title}
				</AppText>
			</Reveal>
			<Reveal
				at={RV.copy}
				className="inset-x-9"
				eng={eng}
				i={i}
				rise={RISE}
				style={top(TOP.line)}
			>
				<AppText
					center
					className="text-[16px] text-foreground/70 leading-6"
					variant="body"
				>
					{b.copy}
				</AppText>
			</Reveal>
			<Reveal
				at={RV.sparks}
				className="inset-x-0"
				eng={eng}
				i={i}
				rise={RISE}
				style={top(TOP.sparks)}
			>
				<SparkCount color={ember} eng={eng} i={i} sparks={b.sparks} />
			</Reveal>
		</>
	);
}

/** A word or line of badge `i`: fades over 380 ms rising 12 pt, from its time (§2). */
function Reveal({
	eng,
	i,
	at,
	rise,
	className,
	style,
	children,
}: {
	eng: SharedValue<Eng>;
	i: number;
	at: number;
	rise: number;
	/** Its sides; `style` has the top, from the status bar. */
	className: string;
	style: StyleProp<ViewStyle>;
	children: ReactNode;
}) {
	const anim = useAnimatedStyle(() => {
		const e = eng.get();
		if (e.phase !== PH.badge || e.step !== i) {
			return { opacity: 0 };
		}
		const p = revealAt(age(e, e.ta), at, e.rm);
		return {
			opacity: p * shutAt(e),
			transform: [{ translateY: e.rm ? 0 : rise * (1 - p) }],
		};
	});
	return (
		<Animated.View
			className={cn("absolute", className)}
			pointerEvents="none"
			style={[{ opacity: 0 }, style, anim]}
		>
			{children}
		</Animated.View>
	);
}
