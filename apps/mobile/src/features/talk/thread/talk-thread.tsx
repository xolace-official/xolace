import { useState } from "react";
import { View } from "react-native";
import { KeyboardChatScrollView } from "react-native-keyboard-controller";
import Animated, {
	type DerivedValue,
	FadeInDown,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { TALK_COPY } from "../copy";
import { useTalkScreen } from "../talk-data";
import { streams } from "../talk-model";
import type { Turn } from "../use-thread";
import { CaptionWords, WORD_STEP_MS } from "./caption-words";
import { useFollowBottom } from "./use-follow-bottom";

const BUBBLE_IN = FadeInDown.duration(220).reduceMotion(
	PLAY_AS_CHOSEN.reduceMotion
);
/** A third-party scroll view takes its layout as styles (`grow justify-end gap-3 px-4`). */
const FILL = { flex: 1 } as const;
const CONTENT = {
	flexGrow: 1,
	gap: 12,
	justifyContent: "flex-end",
	paddingHorizontal: 16,
} as const;

function Bubble({
	turn,
	name,
	reduced,
}: {
	turn: Turn;
	name: string;
	reduced: boolean;
}) {
	const subtle = useTokenColor("subtle");
	const mine = turn.speaker === "person";
	// Streamed here (not a typed or reopened line): its words stay word views, so it never reflows.
	const [streamed] = useState(() => streams(turn));
	return (
		<Animated.View
			className={cn("max-w-[85%] gap-1", mine ? "self-end" : "self-start")}
			entering={reduced ? undefined : BUBBLE_IN}
		>
			<View
				accessibilityLabel={mine ? turn.text : `${name}. ${turn.text}`}
				accessible
				className={cn(
					"rounded-[22px] px-4 py-[11px]",
					mine ? "bg-accent/16" : "bg-surface",
					turn.live ? "opacity-80" : "opacity-100"
				)}
				style={{ borderCurve: "continuous" }}
			>
				{mine ? null : (
					<AppText
						className="mb-0.5"
						color="accent"
						variant="caption"
						weight="semibold"
					>
						{name}
					</AppText>
				)}
				{streamed ? (
					<CaptionWords
						reduced={reduced}
						stepMs={WORD_STEP_MS[turn.speaker]}
						text={turn.text}
						trail={!mine}
					/>
				) : (
					<AppText className="text-[16px] leading-[24px]" variant="subhead">
						{turn.text || "…"}
					</AppText>
				)}
			</View>
			{mine && turn.via === "voice" ? (
				<View className="flex-row items-center gap-1 self-end pr-2">
					<Icon
						color={subtle}
						name={{ android: "graphic_eq", ios: "waveform" }}
						size={10}
					/>
					<AppText
						className="text-[11px] leading-[14px]"
						color="subtle"
						variant="caption"
					>
						{TALK_COPY.live.spoken}
					</AppText>
				</View>
			) : null}
		</Animated.View>
	);
}

type Props = {
	top: number;
	bottom: number;
	/**
	 * How much of the keyboard the composer's lift doesn't cover: the composer rises by
	 * `keyboard − offset`, and the thread's content rises by the same.
	 */
	offset: number;
	/** The keyboard's share of the bottom inset: `keyboard − offset`. */
	inset: DerivedValue<number>;
	/** The thread is in front; the follow loop runs only then. */
	focused: boolean;
	reduced: boolean;
};

/**
 * The Conversation view (production's transcript): the companion on the left under its
 * name, you on the right with "spoken" under a spoken line. It sits on the composer and
 * follows the newest words; scroll up to reread and it stays put until you settle back near
 * the end. With the keyboard up the thread's bottom inset grows with the composer, on the
 * keyboard's own frames: at the latest line it rides up with the keyboard; scrolled back,
 * it stays where it is.
 */
export function TalkThread({
	top,
	bottom,
	offset,
	inset,
	focused,
	reduced,
}: Props) {
	const { state } = useTalkScreen();
	const live = focused && state.turns.some((t) => t.live);
	const follow = useFollowBottom({ inset, live, reduced });
	return (
		<KeyboardChatScrollView
			contentContainerStyle={[
				CONTENT,
				{ paddingBottom: bottom, paddingTop: top },
			]}
			keyboardDismissMode="interactive"
			keyboardLiftBehavior="whenAtEnd"
			offset={offset}
			onContentSizeChange={follow.onContentSizeChange}
			onLayout={follow.onLayout}
			onMomentumScrollBegin={follow.onDragStart}
			onMomentumScrollEnd={follow.onSettle}
			onScrollBeginDrag={follow.onDragStart}
			onScrollEndDrag={follow.onSettle}
			ref={follow.scrollRef}
			showsVerticalScrollIndicator={false}
			style={FILL}
		>
			{state.turns.map((turn) => (
				<Bubble key={turn.id} name={state.name} reduced={reduced} turn={turn} />
			))}
			{state.error ? (
				<AppText center color="dangerInk" variant="caption">
					{state.error}
				</AppText>
			) : null}
		</KeyboardChatScrollView>
	);
}
