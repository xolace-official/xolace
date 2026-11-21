import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";

type Props = {
	open: boolean;
	title: string;
	desc: string;
	children: ReactNode;
	cancel: string;
	ok: string;
	okDisabled?: boolean;
	gap?: number;
	top?: number;
	onCancel: () => void;
	onOk: () => void;
};

const BUTTON =
	"h-11.5 flex-1 items-center justify-center rounded-[14px] border-continuous";
const BUTTON_TEXT = "text-[16px] leading-[21px]";
const GAP = 18;
const TOP = 210;

export function SettingsDialog({
	open,
	title,
	desc,
	children,
	cancel,
	ok,
	okDisabled = false,
	gap = GAP,
	top = TOP,
	onCancel,
	onOk,
}: Props) {
	return (
		<Modal
			animationType="fade"
			onRequestClose={onCancel}
			statusBarTranslucent
			transparent
			visible={open}
		>
			<View className="flex-1 bg-scrim">
				<View
					accessibilityViewIsModal
					className="absolute right-6 left-6 rounded-[24px] border-continuous bg-surface px-5 pt-5 pb-4 shadow-dialog"
					style={{ top }}
				>
					<AppText
						accessibilityRole="header"
						className="text-[20px] leading-[25px]"
						variant="body"
						weight="bold"
					>
						{title}
					</AppText>
					<AppText
						className="mt-1 text-[14.5px] text-foreground/62 leading-[20.3px]"
						variant="body"
					>
						{desc}
					</AppText>
					{children}
					<View className="flex-row gap-2" style={{ marginTop: gap }}>
						<Pressable
							accessibilityRole="button"
							className={cn(BUTTON, "bg-surface-secondary")}
							onPress={onCancel}
						>
							<AppText className={BUTTON_TEXT} variant="body" weight="semibold">
								{cancel}
							</AppText>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ disabled: okDisabled }}
							className={cn(
								BUTTON,
								"bg-accent",
								okDisabled ? "opacity-40" : "opacity-100"
							)}
							disabled={okDisabled}
							onPress={onOk}
						>
							<AppText
								className={BUTTON_TEXT}
								color="accentForeground"
								variant="body"
								weight="semibold"
							>
								{ok}
							</AppText>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}

export const fieldBorder = (bad: boolean) =>
	bad ? "border-danger" : "border-accent";
