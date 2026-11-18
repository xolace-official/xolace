import type { SharedValue } from "react-native-reanimated";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { BackButton } from "@/components/shared/back-button";
import { useTimeLeft } from "@/lib/talk/use-time-left";
import { TALK_COPY } from "../copy";
import type { TalkGeometry } from "../motion/talk-geometry";
import { GO, LAYOUT } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";
import { TalkHelp } from "../stage/talk-help";
import { TalkSwitch } from "../stage/talk-switch";
import { useGroupStyle } from "../start/start-group";
import { Footnote } from "../start/talk-facts";
import { useTalkScreen } from "../talk-data";
import { TalkMenu } from "./talk-menu";
import { TalkPill } from "./talk-pill";

const MINUTE_MS = 60_000;

type Props = {
	geo: TalkGeometry;
	motion: TalkMotion;
	lift: SharedValue<number>;
	before: boolean;
	/** The talk is in front: the pill's face keeps its clock. */
	focused: boolean;
};

/** The header (back, the title pill, ⋯), the view switch and help (§2.1, §4). */
export function TalkChrome({ geo, motion, lift, before, focused }: Props) {
	const { state, actions } = useTalkScreen();
	// Whole minutes: a label that changes every second rebuilds the open menu.
	const minutesLeft = useTimeLeft(state.endsAt, MINUTE_MS);
	const talking = state.phase === "talk";
	return (
		<>
			<TalkPill
				before={before}
				motion={motion}
				running={focused && !before}
				top={geo.pillTop}
			/>
			{before ? null : (
				<TalkSwitch
					motion={motion}
					onChange={actions.setView}
					top={geo.switchTop}
					view={state.view}
				/>
			)}
			<BackButton
				className="absolute"
				label={TALK_COPY.start.back}
				style={{ left: LAYOUT.gutter, top: geo.headerTop }}
			/>
			<TalkMenu
				live={talking}
				minutesLeft={talking ? minutesLeft : null}
				muted={state.muted}
				onEnd={actions.end}
				onHelp={actions.openHelp}
				onJustEnd={actions.justEnd}
				onMute={actions.toggleMic}
				top={geo.headerTop}
			/>
			{state.help && !before ? (
				<TalkHelp
					geo={geo}
					help={state.help}
					lift={lift}
					onOpen={actions.openHelp}
					onResource={actions.openResource}
				/>
			) : null}
		</>
	);
}

/** Under Start before the talk; after the button in the tree, so VoiceOver reads it second. */
export function FootnoteOverlay({
	motion,
	startTop,
	before,
}: {
	motion: TalkMotion;
	startTop: SharedValue<number>;
	before: boolean;
}) {
	const { state, actions } = useTalkScreen();
	const fade = useGroupStyle(motion, 4, 0, GO.footFade);
	const top = useAnimatedStyle(() => ({
		top: startTop.get() + LAYOUT.startH + LAYOUT.footGap,
	}));
	return (
		<Animated.View
			className="absolute inset-x-6"
			pointerEvents={before ? "box-none" : "none"}
			style={[top, fade]}
		>
			<Footnote
				error={state.error}
				micAsk={state.micAsk}
				onKept={actions.openKept}
				week={state.week}
			/>
		</Animated.View>
	);
}
