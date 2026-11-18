// Support's preview: the feeling the Mirror named, and three branches drawing down to three
// ways to be with it, which pop in after them. Played once per opening.
import { View } from "react-native";
import Animated, {
	Easing,
	type SharedValue,
	useAnimatedProps,
	useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { useTokenColor } from "@/lib/use-token-color";
import { FIRST_LOOK } from "../copy";
import { unit } from "../first-look-motion";
import { LineIcon, type LineIconName } from "./line-icon";
import { useAct } from "./use-act";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const BRANCHES = [
	"M138 2C138 30 46 26 46 54",
	"M138 2V54",
	"M138 2C138 30 230 26 230 54",
];
const DASH = 140;
const DRAW_FROM_MS = 120;
const DRAW_MS = 700;
const POP_AT_MS = [500, 580, 660] as const;
const POP_MS = 450;
const ACT_MS = 1200;
const DRAW_EASE = Easing.bezierFn(0.3, 0.6, 0.3, 1);
const POP_EASE = Easing.bezierFn(0.3, 1.5, 0.5, 1);

function Branch({
	act,
	color,
	d,
}: {
	act: SharedValue<number>;
	color: string;
	d: string;
}) {
	const props = useAnimatedProps(() => ({
		strokeDashoffset:
			DASH * (1 - DRAW_EASE(unit((act.get() - DRAW_FROM_MS) / DRAW_MS))),
	}));
	return (
		<AnimatedPath
			animatedProps={props}
			d={d}
			fill="none"
			stroke={color}
			strokeDasharray={[DASH, DASH]}
			strokeLinecap="round"
			strokeOpacity={0.55}
			strokeWidth={1.5}
		/>
	);
}

type ItemProps = {
	act: SharedValue<number>;
	i: number;
	icon: LineIconName;
	label: string;
};

function SupportItem({ act, i, icon, label }: ItemProps) {
	const foreground = useTokenColor("foreground");
	const at = POP_AT_MS[i] ?? 0;
	const style = useAnimatedStyle(() => {
		const e = POP_EASE(unit((act.get() - at) / POP_MS));
		return {
			opacity: unit(e),
			transform: [{ translateY: 4 * (1 - e) }, { scale: 0.85 + 0.15 * e }],
		};
	});
	return (
		<Animated.View className="flex-1 items-center gap-[5px]" style={style}>
			<View className="-mt-3.5 size-9 items-center justify-center rounded-full border border-separator bg-surface-secondary">
				<LineIcon color={foreground} name={icon} size={18} weight={1.9} />
			</View>
			<AppText color="muted" numberOfLines={1} variant="caption">
				{label}
			</AppText>
		</Animated.View>
	);
}

type Props = { open: boolean; reduced: boolean };

export function SupportPreview({ open, reduced }: Props) {
	const ember = useTokenColor("ember");
	const act = useAct(open, reduced, ACT_MS);
	return (
		<View
			accessibilityLabel={FIRST_LOOK.a11y.support}
			accessible
			className="h-[118px]"
		>
			<Svg
				height={56}
				preserveAspectRatio="none"
				style={{ left: 0, position: "absolute", top: 30 }}
				viewBox="0 0 276 56"
				width="100%"
			>
				{BRANCHES.map((d) => (
					<Branch act={act} color={ember} d={d} key={d} />
				))}
			</Svg>
			<View className="absolute inset-x-0 top-0 items-center">
				<View className="h-8 justify-center rounded-full border-[1.5px] border-ember/55 bg-ember-wash px-4.5">
					<AppText
						maxFontSizeMultiplier={1.15}
						variant="callout"
						weight="semibold"
					>
						{FIRST_LOOK.named}
					</AppText>
				</View>
			</View>
			<View className="absolute inset-x-0 top-18 flex-row">
				{FIRST_LOOK.supports.map((s, i) => (
					<SupportItem
						act={act}
						i={i}
						icon={s.icon}
						key={s.label}
						label={s.label}
					/>
				))}
			</View>
		</View>
	);
}
