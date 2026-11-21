import { DISPLAY_NAME_MAX_CODE_POINTS } from "@xolace/backend/shared";
import { SymbolView } from "expo-symbols";
import { Button, useThemeColor } from "heroui-native";
import { useRef } from "react";
import {
	ScrollView,
	type ScrollViewInstance,
	TextInput,
	View,
} from "react-native";
import { useKeyboardState } from "react-native-keyboard-controller";
import { AppText } from "@/components/shared/app-text";
import { suggestHandle } from "@/features/intake/answer-rules";
import { Flux } from "@/features/intake/v2/flux";
import { KeyboardStep } from "@/features/intake/v2/keyboard-step";
import { playSoftPress } from "@/lib/haptics";

const FLUX_SIZE = 160;
const FLUX_SIZE_TYPING = 96;

type Props = {
	busy: boolean;
	name: string;
	onChange: (name: string) => void;
	onKeep: () => void;
	skipped: boolean;
};

export function NameStep({ busy, name, onChange, onKeep, skipped }: Props) {
	const [muted, foreground] = useThemeColor(["muted", "foreground"]);
	const blank = name.trim().length === 0;
	const typing = useKeyboardState((state) => state.isVisible);
	const scroll = useRef<ScrollViewInstance>(null);
	const keep = () => {
		if (blank || busy) {
			return;
		}
		playSoftPress();
		onKeep();
	};

	return (
		<KeyboardStep
			footer={
				<Button isDisabled={blank || busy} onPress={keep}>
					<Button.Label>Keep it</Button.Label>
				</Button>
			}
		>
			<ScrollView
				className="flex-1 overflow-hidden"
				contentContainerClassName="items-center"
				keyboardShouldPersistTaps="handled"
				onLayout={() => {
					if (typing) {
						scroll.current?.scrollToEnd({ animated: false });
					}
				}}
				ref={scroll}
				showsVerticalScrollIndicator={false}
			>
				<Flux mood="happy" size={typing ? FLUX_SIZE_TYPING : FLUX_SIZE} />
				<AppText
					accessibilityRole="header"
					className="mt-3.5 text-center font-[Poppins-SemiBold] text-[26px] text-foreground leading-[31px]"
				>
					{skipped
						? "One last thing: a name for the fire."
						: "Got it. One last thing: a name for the fire."}
				</AppText>
				<AppText className="mt-2.5 text-center font-[Poppins-Regular] text-[15px] text-muted leading-[22px]">
					We picked one. It&apos;s the only name anyone here will see.
				</AppText>

				<View className="mt-[26px] flex-row items-center gap-2.5 self-stretch">
					<TextInput
						accessibilityLabel="Your name here"
						className="h-14 flex-1 rounded-2xl border border-border bg-surface-secondary px-[18px] font-[Poppins-Medium] text-[18px] text-foreground"
						enablesReturnKeyAutomatically
						maxLength={DISPLAY_NAME_MAX_CODE_POINTS}
						onChangeText={onChange}
						onSubmitEditing={keep}
						placeholder="Your name here"
						placeholderTextColor={muted}
						returnKeyType="go"
						value={name}
					/>
					<Button
						accessibilityLabel="Suggest another name"
						className="size-14"
						isIconOnly
						onPress={() => {
							playSoftPress();
							onChange(suggestHandle());
						}}
						variant="outline"
					>
						<SymbolView
							name={{ android: "casino", ios: "dice" } as never}
							size={22}
							tintColor={foreground}
						/>
					</Button>
				</View>
			</ScrollView>
		</KeyboardStep>
	);
}
