// `type`: the same question with room to answer. "Talk instead" joins with the listen step.
import { Button, useThemeColor } from "heroui-native";
import { TextInput, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { AppText } from "@/components/shared/app-text";
import { FluxStill } from "@/features/intake/v2/flux-still";
import { playSoftPress } from "@/lib/haptics";

const FLUX_SIZE = 64;
/** Room to say it, not to write an essay before the first reflection. */
const MAX_ANSWER_CHARS = 1000;

type Props = {
	draft: string;
	onChange: (text: string) => void;
	onSend: () => void;
};

export function TypeStep({ draft, onChange, onSend }: Props) {
	const [placeholderColor] = useThemeColor(["muted"]);
	const empty = draft.trim().length === 0;

	return (
		<View className="flex-1">
			<View className="flex-1 px-6 pt-6">
				<View className="flex-row items-center gap-3">
					<FluxStill mood="idle" size={FLUX_SIZE} />
					<AppText
						accessibilityRole="header"
						className="flex-1 font-[Poppins-SemiBold] text-[20px] text-foreground leading-[26px]"
					>
						What&apos;s been sitting with you lately?
					</AppText>
				</View>
				<AppText className="mt-5 font-[Poppins-Regular] text-[13px] text-muted">
					A sentence is plenty
				</AppText>
				<TextInput
					accessibilityLabel="Your answer"
					autoFocus
					className="mt-2 min-h-[160px] rounded-[18px] border border-border bg-surface-secondary p-4 font-[Poppins-Regular] text-[17px] text-foreground leading-[25px]"
					maxLength={MAX_ANSWER_CHARS}
					multiline
					onChangeText={onChange}
					placeholder="Start anywhere…"
					placeholderTextColor={placeholderColor}
					textAlignVertical="top"
					value={draft}
				/>
			</View>

			<KeyboardStickyView>
				<View className="px-6 pb-4">
					<Button
						isDisabled={empty}
						onPress={() => {
							playSoftPress();
							onSend();
						}}
					>
						<Button.Label>Send to Flux</Button.Label>
					</Button>
				</View>
			</KeyboardStickyView>
		</View>
	);
}
