import { type ComponentRef, type Ref, useEffect } from "react";
import { Pressable, type View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Icon, type IconName } from "@/components/shared/icon";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "../copy";
import { PULL } from "../motion";
import type { MirrorLine as Line, Timeline } from "../reflect-model";
import { resist } from "./curves";
import { type MirrorInk, MirrorWord, WordRow } from "./mirror-word";
import { Shimmer } from "./shimmer";

/** The arrow pops past the threshold with overshoot (the block's POP 520/18). */
const POP = { damping: 18, mass: 1, stiffness: 520 } as const;
/** Reduce Motion: the pull's pieces fade instead of springing. */
const REDUCED_MS = 150;
/** Board `.mline.sel`: the chosen line steps in 14 pt behind a 2.5 pt ember bar (.25 s). */
const SEL_PAD = 14;
const BAR_W = 2.5;
const SEL_MS = 250;
const SOFT_MS = 300;
const ARROW: IconName = {
	android: "reply",
	ios: "arrowshape.turn.up.left.fill",
};
const ARROW_SIZE = 11;
const MISSED = "missed";

type Props = {
	index: number;
	line: Line;
	e: SharedValue<number>;
	tl: Timeline;
	heavy: boolean;
	ink: MirrorInk;
	/** The pick-mode wash's colour (`ember-wash`). */
	wash: string;
	flashN: number;
	rewriting: boolean;
	selected: boolean;
	soft: boolean;
	pickMode: boolean;
	canDrag: boolean;
	reduced: boolean;
	onArm: () => void;
	onChoose: (i: number) => void;
	onTap: (i: number) => void;
	ref?: Ref<ComponentRef<typeof View>>;
};

/**
 * One line of the mirror. Drag it right to say that part missed (S9: the line follows
 * `resist(d)`, an ember arrow chip appears on its left, it arms at 40 pt of pull and springs back
 * on 300/26); tap it to flash where you said it. While a refinement is with the server the line
 * shimmers with its layout held (S10). VoiceOver reads it as one block, with "This part missed"
 * as an action.
 */
export function MirrorLine(props: Props) {
	const { index, line, e, tl, heavy, ink, wash, flashN, reduced } = props;
	const { selected, soft, pickMode, canDrag, onArm, onChoose, onTap } = props;
	const pull = useSharedValue(0);
	const held = useSharedValue(0);
	const arm = useSharedValue(0);
	const armed = useSharedValue(false);
	const sel = useSharedValue(selected ? 1 : 0);
	const dim = useSharedValue(soft ? 1 : 0);

	useEffect(() => {
		sel.set(withTiming(selected ? 1 : 0, { duration: SEL_MS }));
	}, [selected, sel]);
	useEffect(() => {
		dim.set(withTiming(soft ? 1 : 0, { duration: SOFT_MS }));
	}, [soft, dim]);

	const pan = usePanGesture({
		activeOffsetX: PULL.activeX,
		enabled: canDrag,
		failOffsetY: [-PULL.failY, PULL.failY],
		onActivate: () => {
			armed.set(false);
			arm.set(0);
		},
		onDeactivate: () => {
			if (armed.get()) {
				scheduleOnRN(onChoose, index);
			}
			armed.set(false);
			// Everything the pull moved goes back together: `pull` keeps its value, `held` lets go.
			held.set(
				reduced
					? withTiming(0, { duration: REDUCED_MS, ...PLAY_AS_CHOSEN })
					: withSpring(0, PULL.settle)
			);
		},
		onUpdate: (ev) => {
			held.set(1);
			const reach = resist(ev.translationX);
			pull.set(reach);
			const isArmed = reach >= PULL.arm;
			if (isArmed !== armed.get()) {
				armed.set(isArmed);
				if (isArmed) {
					scheduleOnRN(onArm);
				}
				const to = isArmed ? 1 : 0;
				arm.set(
					reduced
						? withTiming(to, { duration: REDUCED_MS, ...PLAY_AS_CHOSEN })
						: withSpring(to, POP)
				);
			}
		},
	});

	const lineStyle = useAnimatedStyle(() => ({
		opacity: 1 - (1 - PULL.dim) * dim.get(),
		paddingLeft: SEL_PAD * sel.get(),
		transform: [{ translateX: pull.get() * held.get() }],
	}));
	const barStyle = useAnimatedStyle(() => ({ opacity: sel.get() }));
	const arrowStyle = useAnimatedStyle(() => ({
		opacity: Math.min(1, (pull.get() * held.get()) / PULL.arm),
		transform: [{ scale: PULL.arrowFrom + (1 - PULL.arrowFrom) * arm.get() }],
	}));

	const text = line.words.map((w) => w.text).join(" ");

	return (
		<GestureDetector gesture={pan}>
			<Animated.View
				accessibilityActions={
					canDrag
						? [{ label: COPY.mirror.lineAction, name: MISSED }]
						: undefined
				}
				accessibilityLabel={text}
				accessibilityRole="text"
				accessible
				onAccessibilityAction={(ev) => {
					if (ev.nativeEvent.actionName === MISSED) {
						onChoose(index);
					}
				}}
				ref={props.ref}
				style={lineStyle}
			>
				<Pressable accessible={false} onPress={() => onTap(index)}>
					<Animated.View
						className="rounded-[10px]"
						style={{
							experimental_backgroundImage: pickMode
								? `linear-gradient(90deg, ${wash}, transparent 70%)`
								: undefined,
						}}
					>
						<WordRow>
							{line.words.map((w) => (
								<MirrorWord
									e={e}
									flashN={flashN}
									heavy={heavy}
									ink={ink}
									key={w.order}
									order={w.order}
									pair={w.pair}
									text={w.text}
									tl={tl}
								/>
							))}
						</WordRow>
						{props.rewriting ? <Shimmer reduced={reduced} /> : null}
					</Animated.View>
				</Pressable>
				<Animated.View
					className="absolute top-1.5 bottom-1.5 left-0 rounded-[2px] bg-ember"
					pointerEvents="none"
					style={[{ width: BAR_W }, barStyle]}
				/>
				<Animated.View
					className="absolute top-1/2 left-[-30px] -mt-3 size-6 items-center justify-center rounded-full bg-ember-wash"
					pointerEvents="none"
					style={arrowStyle}
				>
					<Icon color={ink.ember} name={ARROW} size={ARROW_SIZE} />
				</Animated.View>
			</Animated.View>
		</GestureDetector>
	);
}
