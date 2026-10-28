import { LinearGradient } from "expo-linear-gradient";
import { LinkButton, ScrollShadow, TextArea } from "heroui-native";
import { useEffect, useRef } from "react";
import type { TextInputInstance } from "react-native";
import { ScrollView, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { PillButton } from "@/components/shared/pill-button";
import { removeEmDash } from "@/features/quotes/utils/text-utils";
import {
	closingQuestion,
	MISS_REASON_PLACEHOLDER,
} from "@/features/reflect/clarify-copy";
import type {
	FeedbackType,
	MissReason,
	ReflectionAction,
} from "@/features/reflect/types";

type Props = {
	previousMirror: string;
	clarifyText: string;
	dispatch: React.Dispatch<ReflectionAction>;
	onSubmit: () => void;
	autoFocus?: boolean;
	/**
	 * Which button opened this screen. "not_quite" is a correction; "say_more"
	 * is an answer — and since the reach closes on a question, a mirror that
	 * just asked something must not be followed by a screen accusing it of
	 * missing. Defaults to the correction copy, which is the older behaviour.
	 */
	feedbackType?: FeedbackType | null;
	/** The chip picked in the "What didn't land?" sheet, if any. */
	missReason?: MissReason | null;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_FADE = { opacity: 0 };
const EASE_ANIMATE_FADE = { opacity: 1 };
const EASE_INITIAL_SLIDE = { opacity: 0, translateY: 20 };
const EASE_ANIMATE_SLIDE = { opacity: 1, translateY: 0 };
const EASE_BACK_TRANSITION = {
	duration: 300,
	easing: EASING,
	type: "timing" as const,
};
const EASE_MIRROR_TRANSITION = {
	duration: 600,
	easing: EASING,
	type: "timing" as const,
};
const EASE_PROMPT_TRANSITION = {
	delay: 200,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};

export const ClarifyState = ({
	previousMirror,
	clarifyText,
	dispatch,
	onSubmit,
	autoFocus = true,
	feedbackType,
	missReason,
}: Props) => {
	useEffect(() => {
		Presets.wobble();
	}, []);

	const inputRef = useRef<TextInputInstance>(null);
	// React Native honors `autoFocus` only at mount. When the feedback sheet is
	// open the input mounts unfocused on purpose (the keyboard would rise behind
	// the sheet), so once the sheet closes and `autoFocus` flips true we have to
	// raise the keyboard ourselves — otherwise the user lands on a clarify screen
	// whose input never takes focus.
	const autoFocusedAtMount = useRef(autoFocus);
	useEffect(() => {
		if (autoFocus && !autoFocusedAtMount.current) {
			inputRef.current?.focus();
		}
	}, [autoFocus]);

	const canSubmit = clarifyText.trim().length > 0;
	const isSayMore = feedbackType === "say_more";
	// Answering the mirror's own question is easier than "saying more".
	const question = isSayMore ? closingQuestion(previousMirror) : null;
	const heading = isSayMore
		? (question ?? "Say more")
		: "What didn't land right?";
	const placeholder = isSayMore
		? question
			? "Answer in your own words..."
			: "Add what's missing..."
		: missReason
			? MISS_REASON_PLACEHOLDER[missReason]
			: "Help me understand better...";

	return (
		<View className="flex-1">
			<KeyboardAvoidingView
				behavior="padding"
				className="flex-1 px-6 pt-8"
				keyboardVerticalOffset={50}
			>
				<EaseView
					animate={EASE_ANIMATE_FADE}
					className="mb-2"
					initialAnimate={EASE_INITIAL_FADE}
					transition={EASE_BACK_TRANSITION}
				>
					<LinkButton
						className="self-start"
						onPress={() => {
							dispatch({ type: "BACK_TO_MIRROR" });
						}}
						size="sm"
					>
						<LinkButton.Label className="text-foreground/40">
							← Back to mirror
						</LinkButton.Label>
					</LinkButton>
				</EaseView>
				<EaseView
					animate={EASE_ANIMATE_FADE}
					initialAnimate={EASE_INITIAL_FADE}
					transition={EASE_MIRROR_TRANSITION}
				>
					<ScrollShadow
						className="mb-6 max-h-[160]"
						LinearGradientComponent={LinearGradient}
						size={28}
					>
						<ScrollView
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							<AppText className="text-center text-base text-foreground/30 italic leading-7">
								{removeEmDash(previousMirror)}
							</AppText>
						</ScrollView>
					</ScrollShadow>
				</EaseView>

				<EaseView
					animate={EASE_ANIMATE_SLIDE}
					initialAnimate={EASE_INITIAL_SLIDE}
					transition={EASE_PROMPT_TRANSITION}
				>
					<AppText className="mb-4 text-center text-foreground text-lg">
						{heading}
					</AppText>
				</EaseView>

				<View className="flex-1 overflow-hidden">
					<TextArea
						autoFocus={autoFocus}
						className="min-h-[120] flex-1 border-0 bg-transparent text-base text-foreground android:focus:border-transparent ios:focus:outline-transparent"
						onChangeText={(text: string) =>
							dispatch({ text, type: "CLARIFY_TEXT_CHANGE" })
						}
						placeholder={placeholder}
						// heroui-native still types `ref` as the pre-0.87 TextInput class; the runtime value is the instance.
						ref={inputRef as never}
						value={clarifyText}
						variant="secondary"
					/>
				</View>

				<View className="items-center pt-2 pb-4">
					<PillButton
						disabled={!canSubmit}
						label="Let it out"
						onPress={() => {
							Presets.propel();
							onSubmit();
						}}
					/>
				</View>
			</KeyboardAvoidingView>
		</View>
	);
};
