import { useIsFocused } from "expo-router";
import { useRef } from "react";
import { type TextInputInstance, View, type ViewInstance } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Presets } from "react-native-pulsar";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { fadeUp } from "@/design/entering";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import {
	useKeyboardLift,
	useLiftStyle,
} from "@/lib/keyboard/use-keyboard-lift";
import { COPY } from "../copy";
import { CARET_CLEAR, LAYOUT, useBoardY } from "../layout";
import { FLY, NUDGE } from "../motion";
import { PickedChips } from "../picked-chips";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";
import { BottomBar } from "./bottom-bar";
import { DictationUpsell } from "./dictation-upsell";
import { TextureBand } from "./texture-band";
import { useComposeFace } from "./use-compose-face";
import { WritingBox } from "./writing-box";

const W = LAYOUT.write;
const BAR = LAYOUT.bar;
/** The header's bottom on the board: a long draft scrolls under it, not over it. */
const HEADER_BOTTOM = LAYOUT.header.top + LAYOUT.header.height;
/** The caret stays 16 pt above the bar's top: 12 (bar over keyboard) + 56 (bar) + 16. */
const KEYBOARD_BOTTOM_OFFSET = 12 + BAR.height + CARET_CLEAR;
/** Board `.wprompt`: Bricolage 26/1.12, 720, −.025em, over the title step. */
const QUESTION = {
	fontSize: 26,
	letterSpacing: -0.65,
	lineHeight: 29,
} as const;

/** Writing (board card 02, renders 01–03, 15, 20). */
export function WriteStage() {
	const { state, actions } = useReflect();
	const { text, picks, listening, nudge, prompt, late, take } = state;
	const { reduced, live, liftFrom } = useReflectDraw();
	const y = useBoardY();
	const focused = useIsFocused();
	const lift = useKeyboardLift();
	const liftStyle = useLiftStyle(lift);
	const input = useRef<TextInputInstance>(null);
	const boxRef = useRef<ViewInstance>(null);
	const boxTop = useSharedValue(0);
	const { face, onWriting } = useComposeFace(focused, text, listening, late);

	const bar = useSharedValue(1);
	const barStyle = useAnimatedStyle(() => ({ opacity: bar.get() }));
	const fadeBar = (to: number) =>
		bar.set(withTiming(to, { duration: FLY.barOutMs, ...PLAY_AS_CHOSEN }));

	const send = () => {
		boxRef.current?.measureInWindow((x, top) => liftFrom.set({ x, y: top }));
		input.current?.blur();
		Presets.propel();
		fadeBar(0);
		if (!actions.send()) {
			fadeBar(1);
		}
	};

	return (
		<View className="flex-1">
			<KeyboardAwareScrollView
				bottomOffset={KEYBOARD_BOTTOM_OFFSET}
				contentContainerStyle={{
					gap: W.gap,
					paddingBottom: lift.rest + BAR.height + CARET_CLEAR,
					paddingHorizontal: W.side,
					paddingTop: W.top - HEADER_BOTTOM,
				}}
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				style={{ marginTop: y(HEADER_BOTTOM) }}
			>
				<View className="flex-row items-center" style={{ gap: W.faceGap }}>
					<XolaceFace
						face={face}
						palette={late ? "ember" : undefined}
						size={W.face}
					/>
					<AppText
						accessibilityRole="header"
						className="flex-1"
						style={QUESTION}
						variant="title"
					>
						{prompt}
					</AppText>
				</View>
				<PickedChips words={picks} />
				<View
					// The band measures from the screen's top; the scroll view starts under the header.
					onLayout={(e) =>
						boxTop.set(e.nativeEvent.layout.y + y(HEADER_BOTTOM))
					}
					ref={boxRef}
				>
					<WritingBox
						inputRef={input}
						onWriting={onWriting}
						reduced={reduced}
						running={live && text.length === 0}
					/>
				</View>
				{take.note ? (
					<AppText
						accessibilityLiveRegion="polite"
						className="text-[14px]"
						color="subtle"
						variant="subhead"
					>
						{take.note}
					</AppText>
				) : null}
				{nudge ? (
					<Animated.View entering={fadeUp(0, NUDGE.ms, NUDGE.rise, reduced)}>
						<AppText className="text-[14px]" color="subtle" variant="subhead">
							{late ? COPY.write.nudge.late : COPY.write.nudge.evening}
						</AppText>
					</Animated.View>
				) : null}
			</KeyboardAwareScrollView>

			<TextureBand
				away={text.trim().length > 0 || listening}
				blur={() => input.current?.blur()}
				boxTop={boxTop}
				lift={lift}
			/>

			<Animated.View
				className="absolute"
				style={[
					{ bottom: lift.rest, left: BAR.side, right: BAR.side },
					liftStyle,
					barStyle,
				]}
			>
				<BottomBar onSend={send} onTap={() => input.current?.focus()} />
			</Animated.View>
			<DictationUpsell />
		</View>
	);
}
