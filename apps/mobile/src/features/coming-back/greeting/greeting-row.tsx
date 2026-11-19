import { type ComponentRef, type Ref, useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	Easing,
	interpolateColor,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColors } from "@/lib/use-token-color";
import { RowCheck } from "./row-check";

/** Board `.r`: 64 min, 12 vertical, gap 12; icon 38; title 15.5 / 600; sub 13; chevron 16. */
const ROW = { chevron: 16, glyph: 18 } as const;
const TITLE = { fontSize: 15.5, lineHeight: 19.4 } as const;
const SUB = { lineHeight: 17 } as const;
/** Board `icPop .45s .05s`, `draw .5s .15s (.4,0,.2,1)`, `swapIn .4s .1s` (5 pt), `press .22s` to .975, colour .3 s. */
const T = {
	color: 300,
	draw: { delay: 150, ease: Easing.bezier(0.4, 0, 0.2, 1), ms: 500 },
	pop: { at: 0.6, delay: 50, from: 0.7, ms: 450, peak: 1.12 },
	press: { at: 0.4, ms: 220, scale: 0.975 },
	sub: { delay: 100, ms: 400, rise: 5 },
} as const;

/** The row's icon and its circle's wash and ink, as tokens. */
export type RowLook = { icon: IconName; bg: string; fg: string };

type Props = {
	title: string;
	sub: string;
	look: RowLook;
	done: boolean;
	/** Bumped when this row just ticked: the pop, the draw and the sub play once. */
	tick: number;
	label: string;
	reduced: boolean;
	/** Absent for the freeze row (info only). */
	onPress?: () => void;
	ref?: Ref<ComponentRef<typeof View>>;
};

/** One line of what happened while you were away (handoff §2); done rows tick (§4). */
export function GreetingRow({
	title,
	sub,
	look,
	done,
	tick,
	label,
	reduced,
	onPress,
	ref,
}: Props) {
	const [bg, fg, okWash, okInk, subtle] = useTokenColors([
		look.bg,
		look.fg,
		"success-wash",
		"success-ink",
		"subtle",
	]);
	const d = useSharedValue(done ? 1 : 0);
	const pop = useSharedValue(1);
	const draw = useSharedValue(done ? 1 : 0);
	const subIn = useSharedValue(1);
	const press = useSharedValue(1);

	const seen = useRef(tick);
	useEffect(() => {
		const fresh = tick !== seen.current;
		seen.current = tick;
		if (!fresh || reduced) {
			d.set(
				withTiming(done ? 1 : 0, {
					duration: reduced && fresh ? T.color : 0,
					...PLAY_AS_CHOSEN,
				})
			);
			draw.set(done ? 1 : 0);
			return;
		}
		const up = T.pop.ms * T.pop.at;
		const t = (ms: number, extra = {}) => ({
			duration: ms,
			...extra,
			...PLAY_AS_CHOSEN,
		});
		d.set(withTiming(1, t(T.color)));
		pop.set(T.pop.from);
		pop.set(
			withDelay(
				T.pop.delay,
				withSequence(
					withTiming(T.pop.peak, t(up)),
					withTiming(1, t(T.pop.ms - up))
				)
			)
		);
		draw.set(0);
		draw.set(
			withDelay(
				T.draw.delay,
				withTiming(1, t(T.draw.ms, { easing: T.draw.ease }))
			)
		);
		subIn.set(0);
		subIn.set(withDelay(T.sub.delay, withTiming(1, t(T.sub.ms))));
	}, [tick, done, reduced, d, pop, draw, subIn]);

	const circle = useAnimatedStyle(() => ({
		backgroundColor: interpolateColor(
			d.get(),
			[0, 1],
			[bg ?? "", okWash ?? ""]
		),
		transform: [{ scale: pop.get() }],
	}));
	const fadeOut = useAnimatedStyle(() => ({ opacity: 1 - d.get() }));
	const subStyle = useAnimatedStyle(() => ({
		opacity: subIn.get(),
		transform: [{ translateY: T.sub.rise * (1 - subIn.get()) }],
	}));
	const pressStyle = useAnimatedStyle(() => ({
		transform: [{ scale: press.get() }],
	}));

	const tappable = !!onPress && !done;
	const tap = () => {
		if (!(tappable && onPress)) {
			return;
		}
		const down = T.press.ms * T.press.at;
		if (!reduced) {
			press.set(
				withSequence(
					withTiming(T.press.scale, { duration: down, ...PLAY_AS_CHOSEN }),
					withTiming(1, { duration: T.press.ms - down, ...PLAY_AS_CHOSEN })
				)
			);
		}
		onPress();
	};

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole={tappable ? "button" : "text"}
			accessible
			className="bg-surface"
			disabled={!tappable}
			onPress={tap}
			ref={ref}
		>
			<Animated.View
				className="min-h-16 flex-row items-center gap-3 py-3"
				style={pressStyle}
			>
				<Animated.View
					className="size-9.5 items-center justify-center rounded-full"
					style={circle}
				>
					<Animated.View style={fadeOut}>
						<Icon
							color={fg ?? ""}
							name={look.icon}
							size={ROW.glyph}
							weight="semibold"
						/>
					</Animated.View>
					<RowCheck color={okInk} draw={draw} shown={done} />
				</Animated.View>
				<View className="flex-1 gap-0.5">
					<AppText style={TITLE} variant="callout" weight="semibold">
						{title}
					</AppText>
					<Animated.View style={subStyle}>
						<AppText
							color={done ? "successInk" : "muted"}
							style={SUB}
							variant="footnote"
						>
							{sub}
						</AppText>
					</Animated.View>
				</View>
				{onPress ? (
					<Animated.View style={fadeOut}>
						<Icon
							color={subtle ?? ""}
							name={{ android: "chevron_right", ios: "chevron.right" }}
							size={ROW.chevron}
							weight="semibold"
						/>
					</Animated.View>
				) : null}
			</Animated.View>
		</Pressable>
	);
}
