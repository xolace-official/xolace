import { Dialog, Radio, RadioGroup, Separator } from "heroui-native";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/components/dialog-blur-backdrop";
import { AppText } from "@/components/shared/app-text";

export type RetentionOption = "indefinite" | "6_months" | "1_year";

type Option = {
	value: RetentionOption;
	label: string;
	description: string;
};

const RETENTION_OPTIONS: Option[] = [
	{
		description: "Keep my data until I delete it",
		label: "Indefinite",
		value: "indefinite",
	},
	{
		description: "Auto-delete sessions older than 1 year",
		label: "1 year",
		value: "1_year",
	},
	{
		description: "Auto-delete sessions older than 6 months",
		label: "6 months",
		value: "6_months",
	},
];

type Props = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	currentValue: RetentionOption;
	onSelect: (value: RetentionOption) => void;
};

/**
 * Modal dialog for selecting the data retention preference.
 */
export const RetentionPickerDialog = ({
	isOpen,
	onOpenChange,
	currentValue,
	onSelect,
}: Props) => {
	const handleValueChange = (value: string) => {
		onSelect(value as RetentionOption);
		onOpenChange(false);
	};

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<DialogBlurBackdrop />
				<Dialog.Content className="mx-auto max-w-sm">
					<View className="mb-5">
						<Dialog.Title>Data retention</Dialog.Title>
						<Dialog.Description>
							Choose how long Xolace keeps your session history.
						</Dialog.Description>
					</View>

					<RadioGroup onValueChange={handleValueChange} value={currentValue}>
						{RETENTION_OPTIONS.map((opt, index) => (
							<View key={opt.value}>
								<RadioGroup.Item className="py-3" value={opt.value}>
									<View className="flex-1 gap-0.5">
										<AppText className="font-medium text-base text-foreground">
											{opt.label}
										</AppText>
										<AppText className="text-foreground/50 text-sm">
											{opt.description}
										</AppText>
									</View>
									<Radio />
								</RadioGroup.Item>
								{index < RETENTION_OPTIONS.length - 1 && <Separator />}
							</View>
						))}
					</RadioGroup>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	);
};
