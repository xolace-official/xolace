import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import type { Milestone as MilestoneModel } from "@/features/achievements/arrival/arrival-model";
import {
	age,
	type Eng,
	type Geo,
	liftAt,
	outAt,
	T,
} from "@/features/achievements/arrival/arrival-motion";
import { Count } from "@/features/achievements/arrival/milestone/count";
import { Embers } from "@/features/achievements/arrival/milestone/embers";
import { Fire } from "@/features/achievements/arrival/milestone/fire";
import { MilestoneFreeze } from "@/features/achievements/arrival/milestone/milestone-freeze";
import { Week } from "@/features/achievements/arrival/milestone/week";
import { OnceShown } from "@/features/achievements/arrival/once-shown";
import { COPY } from "@/features/achievements/copy";
import { easeOut, seg } from "@/features/achievements/motion-math";

/** The board's tops (844 pt phone), before the lift. */
const TOP = { count: 404, label: 494, line: 524 } as const;
/** After Next it steps aside: down 24 pt as it fades. */
const OUT_Y = 24;
const LABEL_IN = 350;
const LINE_IN = 400;
const LINE_RISE = 10;

/**
 * The milestone (§3): Flux by the fire, the glow, the count rolling over with a
 * ring of sparks, the line, the lift, the week lighting day by day, the earned
 * freeze. Transforms and opacity only.
 */
export function Milestone({
	eng,
	geo,
	dark,
	rm,
	hidden,
	milestone,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	dark: boolean;
	rm: boolean;
	hidden: boolean;
	milestone: MilestoneModel;
}) {
	const top = (y: number) => ({ top: y + geo.dy });
	const out = useAnimatedStyle(() => {
		const o = outAt(eng.get());
		return { opacity: 1 - o, transform: [{ translateY: OUT_Y * o }] };
	});
	const lift = useAnimatedStyle(() => {
		const e = eng.get();
		return { transform: [{ translateY: liftAt(age(e, e.tm), e.rm) }] };
	});
	const label = useAnimatedStyle(() => {
		const e = eng.get();
		return {
			opacity: e.rm
				? 1
				: easeOut(seg(age(e, e.tm), T.label, T.label + LABEL_IN)),
		};
	});
	const line = useAnimatedStyle(() => {
		const e = eng.get();
		const p = e.rm ? 1 : easeOut(seg(age(e, e.tm), T.line, T.line + LINE_IN));
		return { opacity: p, transform: [{ translateY: LINE_RISE * (1 - p) }] };
	});

	return (
		<>
			<Animated.View
				className="absolute inset-0"
				pointerEvents="box-none"
				style={out}
			>
				<Animated.View
					className="absolute inset-0"
					pointerEvents="none"
					style={lift}
				>
					<Fire dark={dark} eng={eng} geo={geo} hidden={hidden} rm={rm} />
					<Count
						dark={dark}
						eng={eng}
						from={milestone.from}
						to={milestone.day}
						top={TOP.count + geo.dy}
					/>
					<Animated.View
						className="absolute inset-x-0"
						style={[top(TOP.label), label]}
					>
						<AppText
							center
							className="text-[15px] leading-5"
							color="muted"
							variant="body"
						>
							{COPY.milestone.daysInARow}
						</AppText>
					</Animated.View>
					<Animated.View
						className="absolute inset-x-7"
						style={[top(TOP.line), line]}
					>
						<AppText
							center
							className="text-[26px] leading-8 tracking-[-0.52px]"
							variant="title"
						>
							{milestone.line}
						</AppText>
					</Animated.View>
				</Animated.View>
				{/* Only what the server has said: no card stands in for a guess. */}
				{milestone.week ? (
					<Week
						dark={dark}
						days={milestone.week}
						eng={eng}
						geo={geo}
						to={milestone.day}
					/>
				) : null}
				{milestone.freeze ? (
					<MilestoneFreeze
						dark={dark}
						eng={eng}
						freeze={milestone.freeze}
						geo={geo}
					/>
				) : null}
			</Animated.View>
			<OnceShown>
				<Embers dark={dark} eng={eng} geo={geo} />
			</OnceShown>
		</>
	);
}
