import { useThemeColor } from "heroui-native";
import type { RefObject } from "react";
import type { TextInputInstance } from "react-native";
import { TextInput, View, type ViewStyle } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { PillButton } from "@/components/shared/pill-button";
import type { Writing } from "@/features/reflect/compose/compose-face-gaze";
import { DictationStrip } from "@/features/reflect/compose/dictation-strip";
import { LineEndMeter } from "@/features/reflect/compose/line-end-meter";
import type { PlusDictationView } from "@/features/reflect/hooks/use-plus-dictation";
import { a11yHidden } from "@/lib/utils";

// Mirror of MAX_RAW_INPUT in convex/sessions.ts: the input stops accepting past
// this so a user never hits the server's anti-tamper throw. No visible counter.
const MAX_RAW_INPUT = 5000;

type Props = {
	expanded: boolean;
	entryText: string;
	isRecording: boolean;
	/** Null unless the person dictates with Plus. */
	plusDictation: PlusDictationView | null;
	inputRef: RefObject<TextInputInstance | null>;
	style: AnimatedStyle<ViewStyle>;
	onChangeText: (text: string) => void;
	onSubmit: () => void;
	/** Where the writing ends, for the face's eyes. */
	onWriting: (writing: Writing) => void;
};

/** What the card holds once it is the composer: the field and its way out. */
export const MorphCardBody = ({
	expanded,
	entryText,
	isRecording,
	plusDictation,
	inputRef,
	style,
	onChangeText,
	onSubmit,
	onWriting,
}: Props) => {
	const muted = useThemeColor("muted") as string;

	return (
		<Animated.View
			pointerEvents={expanded ? "auto" : "none"}
			style={[{ flex: 1 }, style]}
			{...a11yHidden(!expanded)}
		>
			<View className="flex-1">
				{expanded && <LineEndMeter onWriting={onWriting} text={entryText} />}
				<TextInput
					className="flex-1 pt-4 text-foreground text-lg"
					maxLength={MAX_RAW_INPUT}
					multiline
					onChangeText={onChangeText}
					placeholder={isRecording ? "I'm listening..." : "Start typing..."}
					placeholderTextColor={muted}
					ref={inputRef}
					style={{ textAlignVertical: "top" }}
					value={entryText}
				/>
			</View>

			{plusDictation && <DictationStrip {...plusDictation} />}

			<View className="items-center pt-2">
				<PillButton
					// Sending mid-take would drop the words still being written down.
					disabled={
						entryText.trim().length === 0 ||
						plusDictation?.phase === "listening" ||
						plusDictation?.phase === "writing"
					}
					label="Let it out"
					onPress={() => {
						Presets.propel();
						onSubmit();
					}}
				/>
			</View>
		</Animated.View>
	);
};
