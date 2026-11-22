import { GlassView } from "expo-glass-effect";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated, {
	type SharedValue,
	useSharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useScheme } from "@/design/scheme";
import { press } from "@/design/springs";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { TALK_COPY } from "../copy";
import type { TalkGeometry } from "../motion/talk-geometry";
import { LAYOUT } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";
import { useTalkScreen } from "../talk-data";
import { isLow } from "../talk-model";
import { LevelBars } from "./level-bars";
import { MuteButton } from "./mute-button";
import { HAS_GLASS, ROUND, useComposerMorph } from "./use-composer-morph";

const START_PRESS = 0.97;
const LOCK: IconName = { android: "lock", ios: "lock.fill" };

function startLabel(locked: boolean, low: boolean): string {
	if (locked) {
		return TALK_COPY.start.unlock;
	}
	return low ? TALK_COPY.start.resets : TALK_COPY.start.button;
}

type Props = {
	geo: TalkGeometry;
	motion: TalkMotion;
	startTop: SharedValue<number>;
	lift: SharedValue<number>;
	before: boolean;
};

export function StartComposer({ geo, motion, startTop, lift, before }: Props) {
	const { state, actions } = useTalkScreen();
	const scheme = useScheme();
	const [text, setText] = useState("");
	const typed = text.trim().length > 0;
	const { locked } = state;
	const low = !locked && isLow(state.week);
	const pressed = useSharedValue(1);
	const fill = useTokenColor(low ? "surface-secondary" : "foreground");
	const background = useTokenColor("background");
	const glass = useTokenColor("glass");
	const accentForeground = useTokenColor("accent-foreground");

	const morph = useComposerMorph({
		fill,
		geo,
		glass,
		lift,
		motion,
		pressed,
		startTop,
	});

	const send = () => {
		if (!typed) {
			return;
		}
		playSoftPress();
		actions.send(text);
		setText("");
	};

	return (
		<>
			<MuteButton
				before={before}
				lift={lift}
				motion={motion}
				muted={state.muted}
				onMute={actions.toggleMic}
				top={geo.composerTop}
			/>
			<Animated.View
				className="absolute overflow-hidden border-separator"
				style={[{ borderCurve: "continuous", right: LAYOUT.gutter }, morph.box]}
			>
				<Animated.View
					className="absolute inset-0"
					pointerEvents="none"
					style={morph.fill}
				/>
				{HAS_GLASS && !before ? (
					<Animated.View
						className="absolute inset-0"
						pointerEvents="none"
						style={morph.glass}
					>
						<GlassView
							colorScheme={scheme}
							glassEffectStyle="regular"
							style={[{ flex: 1 }, ROUND]}
						/>
					</Animated.View>
				) : null}
				<Animated.View
					className="absolute inset-0"
					pointerEvents={before ? "auto" : "none"}
					style={morph.label}
				>
					<Pressable
						accessibilityHint={locked ? TALK_COPY.start.unlockHint : undefined}
						accessibilityRole="button"
						accessibilityState={{ busy: state.starting, disabled: low }}
						className="flex-1 items-center justify-center"
						disabled={low || state.starting}
						onPress={locked ? actions.unlock : actions.begin}
						onPressIn={() =>
							pressed.set(press(START_PRESS, motion.reduced.get()))
						}
						onPressOut={() => pressed.set(press(1, motion.reduced.get()))}
					>
						<View className="flex-row items-center gap-2">
							{locked ? (
								<Icon color={background} name={LOCK} size={15} />
							) : null}
							<AppText
								className="text-[17px] leading-[22px]"
								color={low ? "subtle" : "background"}
								variant="body"
								weight="semibold"
							>
								{startLabel(locked, low)}
							</AppText>
						</View>
					</Pressable>
				</Animated.View>
				<Animated.View
					accessibilityElementsHidden={before}
					className="absolute inset-0 flex-row items-center pr-1 pl-4"
					importantForAccessibility={before ? "no-hide-descendants" : "auto"}
					pointerEvents={before ? "none" : "auto"}
					style={morph.field}
				>
					<TextInput
						className="flex-1 font-normal text-[16px] text-foreground"
						keyboardAppearance={scheme}
						onChangeText={setText}
						onSubmitEditing={send}
						placeholder={TALK_COPY.live.placeholder(state.name)}
						placeholderTextColorClassName="accent-subtle"
						returnKeyType="send"
						style={{ height: LAYOUT.composerH }}
						value={text}
					/>
					{typed ? (
						<PressScale
							accessibilityLabel={TALK_COPY.live.send}
							className="size-9 items-center justify-center rounded-full bg-accent"
							onPress={send}
						>
							<Icon
								color={accentForeground}
								name={{ android: "arrow_upward", ios: "arrow.up" }}
								size={16}
								weight="bold"
							/>
						</PressScale>
					) : (
						<LevelBars level={state.micLevel} muted={state.muted} />
					)}
				</Animated.View>
			</Animated.View>
		</>
	);
}
