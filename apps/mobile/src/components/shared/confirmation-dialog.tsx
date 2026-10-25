import { Button, Dialog, Spinner, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";
import { playAffirmativePress, playSoftPress } from "@/src/lib/haptics";

type Props = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel: string;
	onConfirm: () => void;
	isDestructive?: boolean;
	isLoading?: boolean;
};

/**
 * Reusable confirmation dialog following the same pattern as ThemePickerDialog.
 * Supports destructive styling and a loading state on the confirm button.
 */
export const ConfirmationDialog = ({
	isOpen,
	onOpenChange,
	title,
	description,
	confirmLabel,
	onConfirm,
	isDestructive = false,
	isLoading = false,
}: Props) => {
	const dangerFg = useThemeColor("danger-foreground") as string;

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<DialogBlurBackdrop />
				<Dialog.Content className="mx-auto max-w-sm">
					<View className="mb-5 gap-1.5">
						<Dialog.Title>{title}</Dialog.Title>
						<Dialog.Description>
							<AppText className="text-foreground/60 text-sm">
								{description}
							</AppText>
						</Dialog.Description>
					</View>

					<View className="flex-row justify-end gap-3">
						<Button
							isDisabled={isLoading}
							onPress={() => {
								playSoftPress();
								onOpenChange(false);
							}}
							size="sm"
							variant="ghost"
						>
							Cancel
						</Button>
						<Button
							isDisabled={isLoading}
							onPress={() => {
								// Backing out stays soft; committing carries weight. This is the
								// last touch before an irreversible action (wipe data, delete
								// account), and it should not feel like any other button.
								playAffirmativePress();
								onConfirm();
							}}
							size="sm"
							variant={isDestructive ? "danger" : "primary"}
						>
							{isLoading ? (
								<Spinner
									color={isDestructive ? dangerFg : undefined}
									size="sm"
								/>
							) : (
								confirmLabel
							)}
						</Button>
					</View>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	);
};
