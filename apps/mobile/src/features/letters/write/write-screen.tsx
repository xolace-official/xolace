import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { type ComponentRef, useRef, useState } from "react";
import {
	Keyboard,
	Platform,
	Pressable,
	type TextInput,
	View,
} from "react-native";
import Animated, {
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useHeaderOptions } from "@/lib/header-options";
import {
	useKeyboardLift,
	useLiftStyle,
} from "@/lib/keyboard/use-keyboard-lift";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { LETTERS } from "../copy";
import { Fade } from "../fade";
import {
	canSend,
	countLine,
	heldAgain,
	PHASE_OF,
	type WriteStage,
} from "../letters-model";
import { ForChips, StarterChips } from "./chips";
import { LimitView } from "./limit-view";
import { SendButton } from "./send-button";
import { SentView } from "./sent-view";
import { WriteCare } from "./write-care";
import { WriteCount } from "./write-count";
import { useWriteScreen } from "./write-data";
import { WriteField } from "./write-field";
import { WriteLetter } from "./write-letter";
import { WriteLine } from "./write-line";
import { useWriteStage } from "./write-stage";

/** Above For: room for the check's line (three lines at most), so nothing moves when it shows. */
const LINE_AREA = 96;
const ROW_GAP = 18;
const SEND = { height: 52, side: 16 };
/** With the keyboard up, the count sits at least this far above Send. */
const ABOVE_SEND = 8;
/** Under the starters, room to scroll them clear of Send. */
const UNDER_STARTERS = 12;

/**
 * Writing a letter (handoff §3, §5; renders 06–15, 33–34): the sheet, For, the starters, the count
 * near the limits and Send, off under 40 characters. The keyboard rule: Send rides 12 pt above
 * the keyboard and the letter lifts just enough to keep its count clear; the rows it leaves
 * behind fade. A tap anywhere but the field puts the keyboard away.
 */
export function WriteScreen() {
	const { state, actions } = useWriteScreen();
	const header = useHeaderOptions("small");
	const headerH = useHeaderHeight();
	const appReduced = useEffectiveReducedMotion();
	const reduced = state.opens.reduced ?? appReduced;
	const lift = useKeyboardLift();
	const input = useRef<ComponentRef<typeof TextInput>>(null);
	const [height, setHeight] = useState(0);
	const held = heldAgain(state.text, state.held);
	const flow = useWriteStage({
		opens: {
			...state.opens,
			line: state.opens.line ?? (held ? LETTERS.check.held : null),
		},
		reduced,
		send: actions.send,
		text: state.text,
	});
	// Closed mid-check and opened again: it waits, Send off, until that check answers.
	const stage: WriteStage =
		state.checking && flow.stage === "edit" ? "wait" : flow.stage;
	const editing = stage === "edit";
	const limit = flow.limit ?? state.limit;
	const on = editing && limit === null && canSend(state.text, state.held);
	const count = countLine(state.text);
	const sending = stage === "rise" || stage === "sent" || stage === "rest";

	// iOS draws the header over the screen; Android's is opaque, and the screen starts under it.
	const top = Platform.OS === "ios" ? headerH : 0;
	// The count's foot, measured: the check's line and the letter grow with Dynamic Type.
	const countFoot = useSharedValue(0);
	const scrollY = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.set(e.contentOffset.y);
	});
	const sendStyle = useLiftStyle(lift);
	const contentStyle = useAnimatedStyle(() => {
		const sendTop = height - lift.bottom.get() - SEND.height;
		const foot = top + countFoot.get() - scrollY.get();
		const over = Math.max(0, foot + ABOVE_SEND - sendTop);
		return { transform: [{ translateY: lift.keyboard.get() > 0 ? -over : 0 }] };
	});
	const besideKeyboard = useAnimatedStyle(() => ({
		opacity: 1 - lift.progress.get(),
	}));

	return (
		<Pressable
			accessible={false}
			className="flex-1 bg-background"
			onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
			onPress={Keyboard.dismiss}
		>
			<Stack.Screen options={{ ...header, title: LETTERS.write.title }} />
			{editing && limit !== null && limit !== undefined ? (
				<LimitView reduced={reduced} which={limit} />
			) : (
				<>
					<Animated.ScrollView
						contentContainerStyle={{
							paddingBottom: lift.rest + SEND.height + UNDER_STARTERS,
							paddingTop: top,
						}}
						contentInsetAdjustmentBehavior="never"
						keyboardShouldPersistTaps="handled"
						onScroll={onScroll}
						scrollEventThrottle={16}
						showsVerticalScrollIndicator={false}
					>
						<Animated.View style={contentStyle}>
							<Animated.View style={[{ minHeight: LINE_AREA }, besideKeyboard]}>
								<WriteLine
									line={editing ? flow.line : null}
									reduced={reduced}
								/>
							</Animated.View>
							<Animated.View style={besideKeyboard}>
								<Fade on={editing} reduced={reduced}>
									<ForChips />
								</Fade>
							</Animated.View>
							<View style={{ height: ROW_GAP }} />
							<WriteLetter
								phase={PHASE_OF[stage]}
								reduced={reduced}
								text={flow.paper}
							>
								<WriteField
									focus={state.opens.focus}
									hint={count}
									ref={input}
								/>
							</WriteLetter>
							<WriteCount
								count={count}
								on={editing}
								onFoot={(y) => countFoot.set(y)}
								reduced={reduced}
							/>
							<Animated.View className="pt-3" style={besideKeyboard}>
								<Fade on={editing} reduced={reduced}>
									<StarterChips input={input} />
								</Fade>
							</Animated.View>
						</Animated.View>
					</Animated.ScrollView>
					<SentView reduced={reduced} show={stage === "sent"} />
					<Animated.View
						className="absolute"
						pointerEvents={sending ? "none" : "box-none"}
						style={[
							{
								bottom: lift.rest,
								height: SEND.height,
								left: SEND.side,
								right: SEND.side,
							},
							sendStyle,
						]}
					>
						<Fade className="flex-1" on={!sending} reduced={reduced}>
							<SendButton
								off={!on && editing}
								onPress={() => {
									if (on) {
										flow.start({ forWho: state.forWho, text: state.text });
									}
								}}
								reduced={reduced}
								waiting={!editing}
							/>
						</Fade>
					</Animated.View>
				</>
			)}
			<WriteCare onClose={flow.closeCare} open={flow.care} reduced={reduced} />
		</Pressable>
	);
}
