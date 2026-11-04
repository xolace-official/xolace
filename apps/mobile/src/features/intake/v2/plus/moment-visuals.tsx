// The small visuals on the Plus side of the Xolace+ step (#713, README § I): Talk's voice-note
// bar and Kindling's named feeling held by its three supports. Steadiness has its own file.
import { SymbolView } from "expo-symbols";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { icon } from "@/features/insights/domains";
import { useTokenColor } from "@/lib/use-token-color";

// A fixed waveform: the same 22 bars every time, so it reads as a recording, not a meter.
const BAR_COUNT = 22;
const BAR_MIN = 6;
const BAR_SPREAD = 20;
const BAR_STEP = 29;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => ({
	height: BAR_MIN + ((i * BAR_STEP) % BAR_SPREAD),
	id: `bar-${i}`,
}));
const PLAY_ICON_SIZE = 16;
const SUPPORT_ICON_SIZE = 20;

const PLAY = icon("play.fill", "play_arrow");

/**
 * Talk's play bar. Inert until the Talk demo lands: it shows what "Try it" will open, and
 * says so to a screen reader instead of pretending to be a button.
 */
export function TalkBar() {
	// Themed, not in `@theme static`, so it is read through Uniwind.
	const ink = useCSSVariable("--color-offer-ink") as string;
	return (
		<View
			accessibilityLabel="A short talk with Flux. Coming soon."
			accessible
			className="flex-row items-center gap-3 rounded-full border border-ember/30 bg-surface-secondary py-2 pr-3.5 pl-2"
		>
			<View className="size-11 items-center justify-center rounded-full bg-ember">
				<SymbolView name={PLAY} size={PLAY_ICON_SIZE} tintColor={ink} />
			</View>
			<View className="h-7 flex-1 flex-row items-center gap-[3px]">
				{BARS.map((bar) => (
					<View
						className="flex-1 rounded-sm bg-ember/80"
						key={bar.id}
						style={{ height: bar.height }}
					/>
				))}
			</View>
			<AppText className="font-[Poppins-SemiBold] text-[13px] text-ember">
				Try it
			</AppText>
		</View>
	);
}

const SUPPORTS = [
	{ icon: icon("clock", "schedule"), label: "Sit with it", x: -87, y: 58 },
	{ icon: icon("waveform", "graphic_eq"), label: "A soft sound", x: 0, y: 108 },
	{ icon: icon("person.fill", "person"), label: "A Xolacer", x: 87, y: 58 },
] as const;

const HOLD_HEIGHT = 172;
const ARC_R = 100;
const ARC_TOP = -70;
const SUPPORT_WIDTH = 88;
const ARC_STROKE = 1.5;
const ARC_DASH = "4 5";

/** "guilt", held by a dashed arc of Kindling's three supports. */
export function KindlingHold() {
	const border = useTokenColor("border");
	const foreground = useTokenColor("foreground");
	return (
		<View
			accessibilityLabel="The feeling it named, guilt, held by three supports: sit with it, a soft sound, a Xolacer."
			accessible
			className="overflow-hidden"
			style={{ height: HOLD_HEIGHT }}
		>
			<Svg
				height={ARC_R * 2}
				style={{
					alignSelf: "center",
					position: "absolute",
					top: ARC_TOP,
				}}
				width={ARC_R * 2}
			>
				<Circle
					cx={ARC_R}
					cy={ARC_R}
					fill="none"
					r={ARC_R - ARC_STROKE}
					stroke={border}
					strokeDasharray={ARC_DASH}
					strokeWidth={ARC_STROKE}
				/>
			</Svg>
			<View className="absolute top-0 size-20 self-center rounded-full bg-ember/15" />
			<View className="mt-3 self-center rounded-full border border-ember/50 bg-surface-secondary px-[18px] py-[7px]">
				<AppText className="font-[Poppins-SemiBold] text-[15px] text-foreground">
					guilt
				</AppText>
			</View>
			{SUPPORTS.map((support) => (
				<View
					className="absolute items-center gap-1"
					key={support.label}
					style={{
						left: "50%",
						marginLeft: support.x - SUPPORT_WIDTH / 2,
						top: support.y,
						width: SUPPORT_WIDTH,
					}}
				>
					<View className="size-11 items-center justify-center rounded-full border border-border bg-surface">
						<SymbolView
							name={support.icon}
							size={SUPPORT_ICON_SIZE}
							tintColor={foreground}
						/>
					</View>
					<AppText className="text-[11px] text-foreground/80">
						{support.label}
					</AppText>
				</View>
			))}
		</View>
	);
}
