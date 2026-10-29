import {
	BottomSheetScrollView,
	BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import {
	BottomSheet,
	Button,
	CloseButton,
	PressableFeedback,
	useBottomSheetAwareHandlers,
	useThemeColor,
} from "heroui-native";
import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { BottomSheetBlurOverlay } from "@/components/bottom-sheet-blur-overlay";
import { AppText } from "@/components/shared/app-text";

type FrameProps = {
	snapPoints?: string[];
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	// Pass "interactive" for sheets that contain a text input.
	// "extend" is a no-op with enableDynamicSizing (highest detent === current position).
	keyboardBehavior?: "extend" | "interactive" | "fillParent";
};

function FeedbackSheetFrame({
	snapPoints,
	isOpen,
	onClose,
	children,
	keyboardBehavior,
}: FrameProps) {
	const dynamic = !snapPoints;
	const { height: windowHeight } = useWindowDimensions();

	// With an input, a BottomSheetScrollView lets content scroll into view after
	// the sheet shifts up; maxHeight keeps gorhom's dynamic sizing compact until
	// the full content exceeds it.
	const maxScrollHeight = windowHeight * 0.6;

	const innerContent = keyboardBehavior ? (
		<BottomSheetScrollView
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
			style={[styles.scrollView, { maxHeight: maxScrollHeight }]}
		>
			<View className="gap-5 px-6 pt-2 pb-10">{children}</View>
		</BottomSheetScrollView>
	) : (
		<View className="gap-5 px-6 pt-2 pb-10">{children}</View>
	);

	return (
		<BottomSheet
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				<BottomSheetBlurOverlay />
				<BottomSheet.Content
					accessible={false}
					{...(snapPoints ? { snapPoints } : {})}
					backgroundClassName="bg-background"
					enableDynamicSizing={dynamic}
					enableOverDrag={false}
					handleIndicatorClassName="bg-foreground/20"
					keyboardBehavior={keyboardBehavior}
					keyboardBlurBehavior={keyboardBehavior ? "restore" : undefined}
				>
					{innerContent}
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

type HeaderProps = {
	children: ReactNode;
	subtitle?: string;
	// Explicit close affordance for sheets with no other obvious exit; backdrop
	// and pan-down are not obvious if the sheet mis-snaps low.
	onDismiss?: () => void;
};

function FeedbackSheetHeader({ children, subtitle, onDismiss }: HeaderProps) {
	return (
		<View className="flex-row items-start gap-3">
			<View className="flex-1">
				{typeof children === "string" ? (
					<AppText className="mb-1 font-serif text-foreground text-xl">
						{children}
					</AppText>
				) : (
					children
				)}
				{subtitle && (
					<AppText className="font-light text-foreground/40 text-sm">
						{subtitle}
					</AppText>
				)}
			</View>
			{onDismiss && (
				<CloseButton
					accessibilityLabel="Dismiss"
					className="mt-0.5"
					onPress={onDismiss}
				/>
			)}
		</View>
	);
}

type Chip = { key: string; label: string };

type ChipsProps = {
	chips: readonly Chip[];
	selected: string | null;
	onSelect: (key: string) => void;
	// One-shot pick: after a selection the rest dim and stop responding.
	lockOnSelect?: boolean;
};

function FeedbackSheetChips({
	chips,
	selected,
	onSelect,
	lockOnSelect = false,
}: ChipsProps) {
	return (
		<View className="gap-3">
			{chips.map(({ key, label }) => {
				const locked = lockOnSelect && selected !== null;
				return (
					<PressableFeedback
						accessibilityLabel={label}
						accessibilityRole="radio"
						accessibilityState={{
							disabled: locked,
							selected: selected === key,
						}}
						className={`w-full items-center rounded-2xl border py-4 ${
							selected === key
								? "border-accent/40 bg-accent/10"
								: "border-border/65 bg-surface/40"
						} ${locked && selected !== key ? "opacity-40" : ""}`}
						isDisabled={locked}
						key={key}
						onPress={() => onSelect(key)}
					>
						<AppText
							className={`text-sm ${
								selected === key
									? "font-medium text-accent"
									: "font-light text-foreground/70"
							}`}
						>
							{label}
						</AppText>
					</PressableFeedback>
				);
			})}
		</View>
	);
}

type InputProps = {
	value: string;
	onChangeText: (text: string) => void;
	placeholder?: string;
	maxLength?: number;
};

function FeedbackSheetInput({
	value,
	onChangeText,
	placeholder,
	maxLength = 300,
}: InputProps) {
	const foreground = useThemeColor("foreground") as string;
	const { onFocus, onBlur } = useBottomSheetAwareHandlers();
	return (
		<BottomSheetTextInput
			accessibilityLabel="Additional context"
			maxLength={maxLength}
			onBlur={onBlur}
			onChangeText={onChangeText}
			onFocus={onFocus}
			placeholder={placeholder ?? "Anything you want us to know? Tap here"}
			placeholderTextColor={`${foreground}4D`}
			returnKeyType="done"
			style={[styles.input, { color: foreground }]}
			value={value}
		/>
	);
}

type SubmitProps = {
	onPress: () => void;
	disabled?: boolean;
	label?: string;
};

function FeedbackSheetSubmit({
	onPress,
	disabled = false,
	label = "Done",
}: SubmitProps) {
	return (
		<Button
			accessibilityLabel={label}
			className="self-start rounded-xl bg-accent/10"
			isDisabled={disabled}
			onPress={onPress}
			size="sm"
			variant="ghost"
		>
			<Button.Label className="font-medium text-accent text-xs">
				{label}
			</Button.Label>
		</Button>
	);
}

const styles = StyleSheet.create({
	input: { fontSize: 14, paddingHorizontal: 4, paddingVertical: 8 },
	scrollView: { flexGrow: 0 },
});

export const FeedbackSheet = {
	Chips: FeedbackSheetChips,
	Frame: FeedbackSheetFrame,
	Header: FeedbackSheetHeader,
	Input: FeedbackSheetInput,
	Submit: FeedbackSheetSubmit,
};
