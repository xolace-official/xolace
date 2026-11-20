import {
	Canvas,
	Circle,
	Group,
	RadialGradient,
	vec,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { EaseView } from "@/design/ease";
import { loopOrSettle, useLoopRun } from "@/design/ease-loops";
import { useScheme } from "@/design/scheme";
import { useTokenColor } from "@/lib/use-token-color";
import { timing } from "../motion/talk-motion";

const BLEED = 40;
const BELOW = 60;
const COVER = 0.52;
const CLEAR_AT = 0.7;
const LEVEL = { day: 0.7, start: 0.55, talk: 0.8, talking: 1 } as const;
const LEVEL_MS = 600;
const BOTTOM = { x: 0.5, y: 1 } as const;
const LIGHTS = [
	{
		cx: 0.4,
		drift: 0.04,
		key: "a",
		ms: 14_000,
		rx: 0.6,
		ry: 0.7,
		stretch: 0.08,
	},
	{
		cx: 0.7,
		drift: -0.05,
		key: "b",
		ms: 11_000,
		rx: 0.45,
		ry: 0.6,
		stretch: -0.11,
	},
] as const;

function Light({
	light,
	w,
	h,
	color,
	clear,
	running,
}: {
	light: (typeof LIGHTS)[number];
	w: number;
	h: number;
	color: string;
	clear: string;
	running: boolean;
}) {
	const run = useLoopRun(running);
	const drift = loopOrSettle({
		from: { scaleY: 1, translateX: -light.drift * w },
		periodMs: light.ms,
		reduced: false,
		running,
		to: { scaleY: 1 + light.stretch, translateX: light.drift * w },
	});
	const ry = light.ry * h;
	return (
		<EaseView
			className="absolute inset-0"
			key={`${run}-${w}`}
			transformOrigin={BOTTOM}
			{...drift}
		>
			<Canvas style={{ height: h, width: w }}>
				<Group
					transform={[
						{ translateX: light.cx * w },
						{ translateY: h },
						{ scaleX: (light.rx * w) / ry },
					]}
				>
					<Circle cx={0} cy={0} r={ry}>
						<RadialGradient
							c={vec(0, 0)}
							colors={[color, clear]}
							positions={[0, CLEAR_AT]}
							r={ry}
						/>
					</Circle>
				</Group>
			</Canvas>
		</EaseView>
	);
}

export function TalkAurora({
	inTalk,
	talking,
	running,
}: {
	inTalk: boolean;
	talking: boolean;
	running: boolean;
}) {
	const { width, height } = useWindowDimensions();
	const scheme = useScheme();
	const colors = {
		a: useTokenColor(`talk-aurora-a-${scheme}`),
		b: useTokenColor(`talk-aurora-b-${scheme}`),
	};
	const clear = useTokenColor("talk-aurora-clear");
	const level = useSharedValue<number>(LEVEL.start);
	let target: number = LEVEL.start;
	if (scheme === "light") {
		target = LEVEL.day;
	} else if (talking) {
		target = LEVEL.talking;
	} else if (inTalk) {
		target = LEVEL.talk;
	}
	useEffect(() => {
		level.set(withTiming(target, timing(LEVEL_MS)));
	}, [target, level]);
	const style = useAnimatedStyle(() => ({ opacity: level.get() }));
	const w = width + BLEED * 2;
	const h = height * COVER;
	return (
		<View
			className="absolute"
			pointerEvents="none"
			style={{ bottom: -BELOW, height: h, left: -BLEED, width: w }}
		>
			<Animated.View className="absolute inset-0" style={style}>
				{LIGHTS.map((light) => (
					<Light
						clear={clear}
						color={colors[light.key]}
						h={h}
						key={light.key}
						light={light}
						running={running}
						w={w}
					/>
				))}
			</Animated.View>
		</View>
	);
}
