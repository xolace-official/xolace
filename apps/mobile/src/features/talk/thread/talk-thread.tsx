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
	offset: number;
	inset: DerivedValue<number>;
	focused: boolean;
	reduced: boolean;
};

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
