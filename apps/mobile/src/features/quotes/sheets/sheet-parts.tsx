import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { QuoteIcon } from "../chrome/quote-icons";
import type { InkPalette } from "../chrome/quote-ink";

/** The sheets' two buttons: primary (`.btnp`) and ghost (`.btng`). */
export function SheetButton({
	ink,
	label,
	kind,
	onPress,
	disabled,
	className,
	children,
}: {
	ink: InkPalette;
	label: string;
	kind: "primary" | "ghost";
	onPress?: () => void;
	disabled?: boolean;
	className?: string;
	children?: ReactNode;
}) {
	const primary = kind === "primary";
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ disabled: !!disabled }}
			className={cn(
				"h-12 flex-row items-center justify-center gap-2 rounded-full",
				primary ? "px-5.5" : "px-5",
				disabled ? "opacity-35" : "opacity-100",
				className
			)}
			onPress={disabled ? undefined : onPress}
			style={{ backgroundColor: primary ? ink.button : ink.fill }}
		>
			{children}
			<AppText
				className="text-[15.5px]"
				style={{ color: primary ? ink.buttonText : ink.sheetText }}
				variant="callout"
				weight="semibold"
			>
				{label}
			</AppText>
		</PressScale>
	);
}

/** The sheets' small note (`.shn`). */
export function SheetNote({
	ink,
	children,
}: {
	ink: InkPalette;
	children: string;
}) {
	return (
		<AppText
			className="text-[12.5px]"
			style={{ color: ink.sheetText2 }}
			variant="caption"
			weight="medium"
		>
			{children}
		</AppText>
	);
}

/** A segmented control (`.sseg`): a row, or a column for the share formats. */
export function Segments<K extends string>({
	ink,
	items,
	value,
	onChange,
	column,
}: {
	ink: InkPalette;
	items: readonly { id: K; label: string }[];
	value: K;
	onChange: (k: K) => void;
	column?: boolean;
}) {
	return (
		<View
			accessibilityRole="tablist"
			className={cn(
				"p-[3px]",
				column ? "flex-col rounded-[20px]" : "flex-row rounded-full"
			)}
			style={{ backgroundColor: ink.fill }}
		>
			{items.map((it) => {
				const on = it.id === value;
				return (
					<Pressable
						accessibilityRole="tab"
						accessibilityState={{ selected: on }}
						className={cn(
							"items-center justify-center",
							column ? "h-9.5 rounded-[17px]" : "h-8 flex-1 rounded-full"
						)}
						key={it.id}
						onPress={() => onChange(it.id)}
						style={{ backgroundColor: on ? ink.button : "transparent" }}
					>
						<AppText
							className="text-[13.5px]"
							style={{ color: on ? ink.buttonText : ink.sheetText2 }}
							variant="footnote"
							weight="semibold"
						>
							{it.label}
						</AppText>
					</Pressable>
				);
			})}
		</View>
	);
}
