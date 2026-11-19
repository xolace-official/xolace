import { View } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { useClock } from "@/lib/motion/clock";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { useTodayFrame } from "../today-frame";
import type { KindlingEmptyMode } from "./card-mode";
import { pathGeometry } from "./kindling-geometry";
import { BEAT, PATH_H } from "./kindling-model";
import { KindlingPath } from "./kindling-path";

/** The unlit path sits back: the live card's strokes at this opacity. */
const UNLIT = 0.55;
/** The board's four steps, none tended. */
const NO_STEPS = [false, false, false, false] as const;
/** The first node's breath is slow: 30 frames a second, as the live card's. */
const PATH_FPS = 30;
const TOKENS = [
	"surface",
	"surface-secondary",
	"subtle",
	"accent",
	"ember",
	"today-kindling-check",
] as const;

/** VoiceOver's and TalkBack's double tap runs the button's action: the card is one element. */
const ACTIVATE = [{ name: "activate" }];

const TEXT = {
	free: COPY.kindling.empty.free,
	plus: COPY.kindling.empty.plus,
	"setting-up": COPY.kindling.empty.settingUp,
} as const;

type Props = {
	mode: KindlingEmptyMode;
	width: number;
	onScreen: SharedValue<boolean>;
};

/**
 * Today's kindling card with no kindling (`P/design/handoff/kindling.md` §11.1): the live
 * card's header, path and bottom row, so Today never moves when one arrives or goes. The
 * path is drawn unlit (every node waiting, no wash, no pulse); while one is being set up the
 * first node takes the violet "current" look and breathes (held still under Reduce Motion:
 * the frame's `live` is off). One VoiceOver element per state.
 */
export function KindlingEmpty({ mode, width, onScreen }: Props) {
	const [surface, well, subtle, violet, ember, check] = useTokenColors(TOKENS);
	const { actions } = useToday();
	const { live, low } = useTodayFrame();
	const settingUp = mode === "setting-up";
	const clock = useClock(live && settingUp, onScreen, PATH_FPS);
	// Nothing was tended: every tend beat has long finished.
	const beat = useSharedValue<number>(BEAT.end);
	const geo = pathGeometry(width, NO_STEPS.length);
	const text = TEXT[mode];
	let action: (() => void) | undefined;
	if (mode === "plus") {
		action = actions.talkForKindling;
	} else if (mode === "free") {
		action = actions.seeKindlingPlus;
	}

	return (
		<View
			accessibilityActions={action ? ACTIVATE : undefined}
			accessibilityHint={"hint" in text ? text.hint : undefined}
			accessibilityLabel={text.label}
			accessibilityRole={action ? "button" : "text"}
			accessible
			onAccessibilityAction={action}
		>
			<View className="min-h-5.5 flex-row items-center">
				<AppText className="text-[16.5px]" variant="subhead" weight="semibold">
					{COPY.kindling.title}
				</AppText>
			</View>
			<View
				className="mt-2 mb-1.5"
				style={{ height: PATH_H, opacity: UNLIT, width }}
			>
				<KindlingPath
					beat={beat}
					clock={clock}
					colours={{ check, ember, surface, violet, waitStroke: subtle, well }}
					current={settingUp ? 0 : -1}
					dash={subtle}
					done={NO_STEPS}
					geo={geo}
					justDone={-1}
					low={low}
					width={width}
				/>
			</View>
			<View className="min-h-10 flex-row items-center gap-3">
				<View className="flex-1 gap-[3px]">
					<AppText
						className="text-[11.5px] leading-[14px] tracking-[0.8px]"
						color={settingUp ? "muted" : "accentInk"}
						variant="caption"
						weight="bold"
					>
						{text.eyebrow}
					</AppText>
					<AppText
						className="text-[16.5px]"
						variant="subhead"
						weight="semibold"
					>
						{text.title}
					</AppText>
				</View>
				{action && "action" in text ? (
					<PressScale
						className="min-h-10 justify-center rounded-full bg-accent-wash px-4.5"
						onPress={action}
					>
						<AppText color="accentInk" variant="callout" weight="semibold">
							{text.action}
						</AppText>
					</PressScale>
				) : null}
			</View>
		</View>
	);
}
