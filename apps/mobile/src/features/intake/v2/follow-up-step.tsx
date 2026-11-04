// `followUp`: Flux's one follow-up (#708), only when a key field was unclear. Skipping keeps
// what the first answer told us; there is never a second.
import { Button, useThemeColor } from "heroui-native";
import { TextInput, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { AppText } from "@/components/shared/app-text";
import { FluxStill } from "@/features/intake/v2/flux-still";
import { playSoftPress } from "@/lib/haptics";

const FLUX_SIZE = 64;
/** A line or two: it only clears up one thing. */
const MAX_REPLY_CHARS = 300;

type Props = {
	draft: string;
	onChange: (text: string) => void;
	onSend: () => void;
	onSkip: () => void;
	question: string;
};

export function FollowUpStep({
	draft,
	onChange,
	onSend,
	onSkip,
	question,
}: Props) {
	const [placeholderColor] = useThemeColor(["muted"]);
	const empty = draft.trim().length === 0;

	return (
		<View className="flex-1">
			<View className="flex-1 px-6 pt-6">
				<View className="flex-row items-center gap-3">
					<FluxStill mood="talking" size={FLUX_SIZE} />
					<AppText
						accessibilityRole="header"
						className="flex-1 font-[Poppins-SemiBold] text-[20px] text-foreground leading-[26px]"
					>
						{question}
					</AppText>
				</View>
				<AppText className="mt-5 font-[Poppins-Regular] text-[13px] text-muted">
					Just this one, then I&apos;ll show you what I heard
				</AppText>
				<TextInput
					accessibilityLabel="Your reply"
					autoFocus
					className="mt-2 min-h-[110px] rounded-[18px] border border-border bg-surface-secondary p-4 font-[Poppins-Regular] text-[17px] text-foreground leading-[25px]"
					maxLength={MAX_REPLY_CHARS}
					multiline
					onChangeText={onChange}
					placeholder="A few words is plenty…"
					placeholderTextColor={placeholderColor}
					textAlignVertical="top"
					value={draft}
				/>
			</View>

			<KeyboardStickyView>
				<View className="gap-1 px-6 pb-4">
					<Button
						isDisabled={empty}
						onPress={() => {
							playSoftPress();
							onSend();
						}}
					>
						<Button.Label>Send to Flux</Button.Label>
					</Button>
					<Button onPress={onSkip} variant="ghost">
						<Button.Label>Skip</Button.Label>
					</Button>
				</View>
			</KeyboardStickyView>
		</View>
	);
}
