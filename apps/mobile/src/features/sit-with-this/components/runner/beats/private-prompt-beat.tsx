import { TextArea, TextField } from "heroui-native";
import { useRef, useState } from "react";
import { EaseView } from "react-native-ease/uniwind";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { AppText } from "@/src/components/shared/app-text";
import { PillButton } from "@/src/components/shared/pill-button";

// Input never leaves the device. It is never stored, logged, or sent.
type Props = {
	content: string;
	placeholder?: string;
	onComplete: () => void;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const INITIAL_FADE = { opacity: 0 };
const VISIBLE_FADE = { opacity: 1 };
const CONTENT_TRANSITION = {
	duration: 500,
	easing: EASE,
	type: "timing",
} as const;

export function PrivatePromptBeat({ content, placeholder, onComplete }: Props) {
	const [text, setText] = useState("");
	const clearedRef = useRef(false);

	const handleDone = () => {
		if (clearedRef.current) {
			return;
		}
		clearedRef.current = true;
		// Clear before advancing to ensure text is not held in memory.
		setText("");
		onComplete();
	};

	return (
		<KeyboardAvoidingView
			behavior="padding"
			className="w-full flex-1 items-center justify-center"
			keyboardVerticalOffset={10}
		>
			<EaseView
				animate={VISIBLE_FADE}
				className="w-full items-center gap-6 px-8"
				initialAnimate={INITIAL_FADE}
				transition={CONTENT_TRANSITION}
			>
				<AppText className="text-center font-medium text-foreground text-xl leading-relaxed">
					{content}
				</AppText>

				<TextField className="w-full">
					<TextArea
						autoFocus
						onChangeText={setText}
						placeholder={placeholder ?? "Write what needs to be said..."}
						value={text}
					/>
				</TextField>

				<AppText className="text-center text-foreground/40 text-xs">
					This stays on your phone.
				</AppText>

				<PillButton label="Done" onPress={handleDone} />
			</EaseView>
		</KeyboardAvoidingView>
	);
}
