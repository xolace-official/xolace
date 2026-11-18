import type { Ref } from "react";
import { TextInput, type TextInputInstance, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useScheme } from "@/design/scheme";
import { charactersLeft } from "@/features/care/bridge/bridge-model";
import { COPY } from "@/features/care/bridge/copy";

/** A one-line field on a card, with the characters left once they're close to the cap. */
export function Field({
	value,
	onChange,
	placeholder,
	label,
	max,
	autoFocus = false,
	ref,
}: {
	value: string;
	onChange: (text: string) => void;
	placeholder: string;
	label: string;
	max: number;
	autoFocus?: boolean;
	ref?: Ref<TextInputInstance>;
}) {
	const scheme = useScheme();
	const left = charactersLeft(value, max);
	return (
		<View className="gap-1.5">
			<View className="h-13 justify-center rounded-row border border-separator bg-surface px-4">
				<TextInput
					accessibilityLabel={label}
					autoFocus={autoFocus}
					className="py-0 font-normal text-[17px] text-foreground"
					keyboardAppearance={scheme}
					maxLength={max}
					onChangeText={onChange}
					placeholder={placeholder}
					placeholderTextColorClassName="accent-subtle"
					ref={ref}
					value={value}
				/>
			</View>
			{left === null ? null : (
				<AppText className="px-1" color="muted" variant="caption">
					{COPY.recipient.left(left)}
				</AppText>
			)}
		</View>
	);
}
