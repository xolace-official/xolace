// Q1, the name, on its own step with no card, progress or mascot. The suggested
// handle is already in the field so Continue keeps it; an existing user's
// `preferences.displayName` arrives as `initialName` instead.

import { Button, useThemeColor } from "heroui-native";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";

import { AppText } from "@/components/shared/app-text";
import { suggestHandle } from "@/features/intake/answer-rules";
import { IntakeScreen } from "@/features/intake/questionnaire/intake-screen";
import { playSoftPress } from "@/lib/haptics";

interface NameStepProps {
	initialName: string;
	/** `edited` is false when the suggested handle was kept as-is. */
	onDone: (name: string, edited: boolean) => void;
}

export function NameStep({ initialName, onDone }: NameStepProps) {
	const placeholderColor = useThemeColor("muted") as string;
	const [name, setName] = useState(initialName);

	const advance = () => {
		if (name.trim().length === 0) {
			return;
		}
		playSoftPress();
		onDone(name.trim(), name.trim() !== initialName);
	};

	return (
		<IntakeScreen>
			<View className="flex-1 gap-3 px-6 pt-10">
				<AppText className="text-center font-[Poppins-SemiBold] text-[32px] text-foreground leading-[38px]">
					What should we call you?
				</AppText>
				<AppText className="px-4 text-center font-[Poppins-Regular] text-[17px] text-foreground/55 leading-6">
					We picked one for you. Keep it, or make it yours — either way
					it&apos;s the only name anyone here will ever see.
				</AppText>

				<View className="mt-6 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4">
					<TextInput
						autoFocus
						className="flex-1 py-4 text-center font-[Poppins-Medium] text-[18px] text-foreground"
						enablesReturnKeyAutomatically
						maxLength={30}
						onChangeText={setName}
						onSubmitEditing={advance}
						placeholder="Your name here"
						placeholderTextColor={placeholderColor}
						returnKeyType="go"
						value={name}
					/>
					<Pressable
						accessibilityLabel="Suggest another name"
						accessibilityRole="button"
						className="p-1"
						hitSlop={12}
						onPress={() => {
							playSoftPress();
							setName(suggestHandle());
						}}
					>
						<AppText className="text-xl">🎲</AppText>
					</Pressable>
				</View>
			</View>

			{/* Copy and field stay put at the top; only the CTA rides the keyboard. */}
			<KeyboardStickyView>
				<View className="px-6 pb-4">
					<Button isDisabled={name.trim().length === 0} onPress={advance}>
						<Button.Label>Continue</Button.Label>
					</Button>
				</View>
			</KeyboardStickyView>
		</IntakeScreen>
	);
}
