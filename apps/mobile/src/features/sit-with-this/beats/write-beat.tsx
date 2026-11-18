import { useState } from "react";
import { Keyboard, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { CtaButton } from "@/components/shared/cta-button";
import { Icon } from "@/components/shared/icon";
import { useScheme } from "@/design/scheme";
import { BODY_MAX_SCALE, FONTS } from "@/design/type";
import {
	useKeyboardLift,
	useLiftStyle,
} from "@/lib/keyboard/use-keyboard-lift";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { LAYOUT } from "../sit-look";

const W = LAYOUT.write;
/** Board `.prq`: Bricolage 28/720, line height 1.12, −.025em (700 is the loaded cut). */
const HEADING = {
	fontFamily: FONTS.displayBold,
	fontSize: 28,
	letterSpacing: -0.7,
	lineHeight: 31.36,
} as const;
/** Board `.prf textarea`: 18/1.45. */
const FIELD = {
	fontSize: 18,
	lineHeight: 26.1,
	textAlignVertical: "top",
} as const;
const LOCK_ICON = { android: "lock", ios: "lock" } as const;

type Props = { question: string; y: (v: number) => number; onDone: () => void };

/**
 * Writing privately (Speak to it). fix: the question is the heading, and the
 * privacy line is said once and truthfully: nothing is kept, and the text goes
 * when the beat moves on (this unmounts, as production's did). Done sits 12 pt
 * above the keyboard, frame by frame (the keyboard rule).
 */
export function WriteBeat({ question, y, onDone }: Props) {
	const muted = useTokenColor("muted");
	const scheme = useScheme();
	const [text, setText] = useState("");
	const lift = useKeyboardLift();
	const liftStyle = useLiftStyle(lift);
	return (
		<View className="absolute inset-0" pointerEvents="box-none">
			<AppText
				accessibilityRole="header"
				className="absolute"
				style={[HEADING, { left: W.side, right: W.side, top: y(W.headTop) }]}
				variant="title"
			>
				{question}
			</AppText>
			<View
				className="absolute rounded-card bg-surface-secondary px-4.5 py-4"
				style={{
					height: W.fieldH,
					left: W.fieldSide,
					right: W.fieldSide,
					top: y(W.fieldTop),
				}}
			>
				<TextInput
					accessibilityLabel={question}
					autoFocus
					className="flex-1 p-0 font-normal text-foreground"
					keyboardAppearance={scheme}
					maxFontSizeMultiplier={BODY_MAX_SCALE}
					multiline
					onChangeText={setText}
					placeholder={COPY.write.placeholder}
					placeholderTextColorClassName="accent-subtle"
					selectionColorClassName="accent-accent"
					style={FIELD}
					value={text}
				/>
			</View>
			<View
				className="absolute flex-row items-center gap-1.5"
				style={{ left: W.side, right: W.side, top: y(W.lockTop) }}
			>
				<Icon color={muted} name={LOCK_ICON} size={13} />
				<AppText color="muted" variant="footnote">
					{COPY.write.lock}
				</AppText>
			</View>
			<Animated.View
				className="absolute"
				style={[
					{ bottom: lift.rest, left: LAYOUT.cta.side, right: LAYOUT.cta.side },
					liftStyle,
				]}
			>
				<CtaButton
					label={COPY.write.done}
					onPress={() => {
						Keyboard.dismiss();
						onDone();
					}}
				/>
			</Animated.View>
		</View>
	);
}
