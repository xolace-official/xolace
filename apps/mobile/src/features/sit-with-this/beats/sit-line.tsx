import Animated, {
	useAnimatedStyle,
	useDerivedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GleamLine } from "@/components/shared/gleam-line";
import { beatTime, type SitClock } from "../clock/use-sit-clock";
import { COPY } from "../copy";
import { stagger, words } from "../sit-timing";

const LINE = { line: 35.64, size: 27, tracking: 0 } as const;
const SOURCE = {
	fontSize: 12.5,
	letterSpacing: 0.125,
	lineHeight: 16,
	marginBottom: 10,
} as const;
const LEAVE_RISE = 6;

const smoothstep = (x: number) => {
	"worklet";
	const u = Math.min(1, Math.max(0, x));
	return u * u * (3 - 2 * u);
};

type Props = {
	text: string;
	mirror: boolean;
	serial: number;
	clock: SitClock;
	reduced: boolean;
};

export function SitLine({ text, mirror, serial, clock, reduced }: Props) {
	const { leave, at } = clock;
	const time = useDerivedValue(() => beatTime(clock, serial));
	const out = useAnimatedStyle(() => {
		const k = at.get() === serial ? smoothstep(leave.get()) : 0;
		return {
			opacity: 1 - k,
			transform: [{ translateY: reduced ? 0 : -LEAVE_RISE * k }],
		};
	});
	return (
		<Animated.View
			accessibilityLabel={mirror ? `${COPY.fromMirror}. ${text}` : text}
			accessible
			style={out}
		>
			{mirror ? (
				<AppText
					center
					color="subtle"
					style={SOURCE}
					variant="caption"
					weight="semibold"
				>
					{COPY.fromMirror}
				</AppText>
			) : null}
			<GleamLine
				at={0}
				clock={time}
				line={LINE.line}
				reduced={reduced}
				size={LINE.size}
				step={stagger(words(text).length)}
				text={text}
				tracking={LINE.tracking}
			/>
		</Animated.View>
	);
}
