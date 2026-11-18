// "See what's building": Insights' rings for three parts of life, with example values that
// fill once per opening. The heavier one is in ember.
import { View } from "react-native";
import Animated, {
	Easing,
	type SharedValue,
	useAnimatedProps,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { useTokenColor } from "@/lib/use-token-color";
import { FIRST_LOOK } from "../copy";
import { unit } from "../first-look-motion";
import { LineIcon } from "./line-icon";
import { useAct } from "./use-act";

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** An open-bottom 270° arc, radius 26 on a 64 box. */
const ARC = "M13.6 50.4A26 26 0 1 1 50.4 50.4";
const ARC_LEN = 26 * 1.5 * Math.PI;
const FILL_FROM_MS = 150;
const FILL_MS = 900;
const ACT_MS = FILL_FROM_MS + FILL_MS;
const FILL_EASE = Easing.bezierFn(0.3, 0.7, 0.3, 1);
const PERCENT = 100;
const SHOWN_MIN = 0.01;

type ValueProps = { act: SharedValue<number>; color: string; value: number };

function RingValue({ act, color, value }: ValueProps) {
	const props = useAnimatedProps(() => {
		const f = FILL_EASE(unit((act.get() - FILL_FROM_MS) / FILL_MS));
		const shown = (ARC_LEN * value * f) / PERCENT;
		return {
			strokeDashoffset: ARC_LEN - shown,
			strokeOpacity: shown > SHOWN_MIN ? 1 : 0,
		};
	});
	return (
		<AnimatedPath
			animatedProps={props}
			d={ARC}
			fill="none"
			stroke={color}
			strokeDasharray={[ARC_LEN, ARC_LEN]}
			strokeLinecap="round"
			strokeWidth={6}
		/>
	);
}

type Props = { open: boolean; reduced: boolean };

export function RingsPreview({ open, reduced }: Props) {
	const ember = useTokenColor("ember");
	const accent = useTokenColor("accent");
	const muted = useTokenColor("muted");
	const track = useTokenColor("surface-secondary");
	const act = useAct(open, reduced, ACT_MS);
	return (
		<View
			accessibilityLabel={FIRST_LOOK.a11y.rings}
			accessible
			className="flex-row gap-1"
		>
			{FIRST_LOOK.rings.map((g) => (
				<View className="flex-1 items-center" key={g.title}>
					<Svg
						height={58}
						style={{ overflow: "visible" }}
						viewBox="0 0 64 64"
						width={58}
					>
						<Path
							d={ARC}
							fill="none"
							stroke={track}
							strokeLinecap="round"
							strokeWidth={6}
						/>
						<RingValue
							act={act}
							color={g.ember ? ember : accent}
							value={g.value}
						/>
					</Svg>
					<View className="absolute top-[39px]">
						<LineIcon
							color={g.ember ? ember : muted}
							name={g.icon}
							size={16}
							weight={1.8}
						/>
					</View>
					<AppText
						center
						maxFontSizeMultiplier={1.15}
						numberOfLines={1}
						variant="caption"
						weight="semibold"
					>
						{g.title}
					</AppText>
					<AppText
						color={g.ember ? "emberInk" : "subtle"}
						maxFontSizeMultiplier={1.15}
						numberOfLines={1}
						variant="caption"
						weight={g.ember ? "semibold" : "regular"}
					>
						{g.word}
					</AppText>
				</View>
			))}
		</View>
	);
}
