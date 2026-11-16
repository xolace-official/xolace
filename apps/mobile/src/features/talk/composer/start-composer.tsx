import { GlassView } from "expo-glass-effect";
import { useState } from "react";
import { Pressable, TextInput } from "react-native";
import Animated, {
	type SharedValue,
	useSharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useScheme } from "@/design/scheme";
import { press } from "@/design/springs";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
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

type Props = {
	geo: TalkGeometry;
	motion: TalkMotion;
	/** Where the Start button sits on screen before the talk. */
	startTop: SharedValue<number>;
	/** How far the keyboard lifts the composer. */
	lift: SharedValue<number>;
	before: boolean;
};

/**
 * Start talking, which becomes the composer (handoff §2.6, §6): one element whose box moves
 * from the button's place to the composer's (left 16 → 68, height 56 → 44, radius 28 → 22,
 * ink → glass) on the start → talk timeline. Its label fades at once; the field and the
 * level bars fade in from 280 ms; the mute button scales in beside it from 300 ms.
 */
export function StartComposer({ geo, motion, startTop, lift, before }: Props) {
	const { state, actions } = useTalkScreen();
	const scheme = useScheme();
	const [text, setText] = useState("");
	const typed = text.trim().length > 0;
	const low = isLow(state.week);
	const pressed = useSharedValue(1);
	const fill = useTokenColor(low ? "surface-secondary" : "foreground");
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
					// Mounted with the talk, at opacity 0: the native view installs its glass once it shows.
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
						accessibilityRole="button"
						accessibilityState={{ disabled: low }}
						className="flex-1 items-center justify-center"
						disabled={low}
						onPress={() => {
							playAffirmativePress();
							actions.begin();
						}}
						onPressIn={() =>
							pressed.set(press(START_PRESS, motion.reduced.get()))
						}
						onPressOut={() => pressed.set(press(1, motion.reduced.get()))}
					>
						<AppText
							className="text-[17px] leading-[22px]"
							color={low ? "subtle" : "background"}
							variant="body"
							weight="semibold"
						>
							{low ? TALK_COPY.start.resets : TALK_COPY.start.button}
						</AppText>
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
