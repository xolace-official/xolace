// `name`: the camper name, already picked. Keep it, edit it, or roll the dice. No "Hey,
// name" beat after it (#707).
import { SymbolView } from "expo-symbols";
import { Button, useThemeColor } from "heroui-native";
import { TextInput, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { AppText } from "@/components/shared/app-text";
import { suggestHandle } from "@/features/intake/answer-rules";
import { Flux } from "@/features/intake/v2/flux";
import { NAME_MAX_CHARS } from "@/features/intake/v2/machine";
import { playSoftPress } from "@/lib/haptics";

const FLUX_SIZE = 160;

type Props = {
	busy: boolean;
	name: string;
	onChange: (name: string) => void;
	onKeep: () => void;
	/** "Got it." only follows an answer; after Skip there is nothing to have got. */
	skipped: boolean;
};

export function NameStep({ busy, name, onChange, onKeep, skipped }: Props) {
	const [muted, foreground] = useThemeColor(["muted", "foreground"]);
	const blank = name.trim().length === 0;
	const keep = () => {
		if (blank || busy) {
			return;
		}
		playSoftPress();
		onKeep();
	};

	return (
		<View className="flex-1">
			<View className="flex-1 items-center px-6 pt-6">
				<Flux mood="happy" size={FLUX_SIZE} />
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
						maxLength={NAME_MAX_CHARS}
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
			</View>

			<KeyboardStickyView>
				<View className="px-6 pb-4">
					<Button isDisabled={blank || busy} onPress={keep}>
						<Button.Label>Keep it</Button.Label>
					</Button>
				</View>
			</KeyboardStickyView>
		</View>
	);
}
