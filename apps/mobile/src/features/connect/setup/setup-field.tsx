import { useState } from "react";
import { TextInput, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";

type Props = {
	label: string;
	value: string;
	onChange: (next: string) => void;
	max: number;
	placeholder: string;
	multiline?: boolean;
	warnAt?: number;
	help?: string;
};

export function SetupField({
	label,
	value,
	onChange,
	max,
	placeholder,
	multiline,
	warnAt,
	help,
}: Props) {
	const [focused, setFocused] = useState(false);
	const n = value.length;
	const warn = warnAt !== undefined && max - n <= warnAt;
	const count = (
		<AppText
			className={cn(
				"text-[12.5px] leading-4",
				warn ? "text-ember-ink" : "text-foreground/42"
			)}
		>
			{multiline ? `${n} / ${max}` : `${n}/${max}`}
		</AppText>
	);
	return (
		<View>
			<AppText
				className="text-[13px] text-foreground/62 leading-[17px]"
				weight="semibold"
			>
				{label}
			</AppText>
			<View
				className={cn(
					"mt-1.5 rounded-[13px] border-[1.5px] border-continuous bg-surface-secondary px-3.5",
					multiline ? "min-h-31 py-3" : "h-11.5 flex-row items-center",
					focused ? "border-accent" : "border-transparent"
				)}
			>
				<TextInput
					accessibilityLabel={label}
					autoCapitalize={multiline ? "sentences" : "words"}
					autoCorrect={multiline}
					className={cn(
						"flex-1 py-0 font-normal text-[17px] text-foreground",
						multiline && "leading-[23px]"
					)}
					maxLength={max}
					multiline={multiline}
					onBlur={() => setFocused(false)}
					onChangeText={onChange}
					onFocus={() => setFocused(true)}
					placeholder={placeholder}
					placeholderTextColorClassName="accent-subtle"
					returnKeyType={multiline ? "default" : "done"}
					selectionColorClassName="accent-accent"
					textAlignVertical="top"
					value={value}
				/>
				{multiline ? null : count}
			</View>
			<View className="mt-1.5 flex-row justify-between gap-3">
				{help ? (
					<AppText className="flex-1" color="muted" variant="footnote">
						{help}
					</AppText>
				) : (
					<View className="flex-1" />
				)}
				{multiline ? count : null}
			</View>
		</View>
	);
}
