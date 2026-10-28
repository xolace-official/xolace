import { Dialog, Radio, RadioGroup, Separator } from "heroui-native";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/components/dialog-blur-backdrop";
import { AppText } from "@/components/shared/app-text";
import type { MirrorTone } from "@/features/reflect/hooks/use-mirror-settings";

type ToneOption = {
	value: MirrorTone;
	label: string;
	description: string;
};

const TONE_OPTIONS: ToneOption[] = [
	{
		description: "Reads your writing style and mirrors it back",
		label: "Adaptive",
		value: "adaptive",
	},
	{
		description: "Evocative, metaphor-rich language",
		label: "Poetic",
		value: "poetic",
	},
	{
		description: "Warm, simple language",
		label: "Gentle",
		value: "gentle",
	},
	{
		description: "Clear and minimal, no metaphors",
		label: "Direct",
		value: "direct",
	},
	{
		description: "Begins with a moment of recognition, then mirrors",
		label: "Witnessed",
		value: "witnessed",
	},
];

type Props = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	currentTone: MirrorTone;
	onSelect: (tone: MirrorTone) => void;
};

export const MirrorTonePickerDialog = ({
	isOpen,
	onOpenChange,
	currentTone,
	onSelect,
}: Props) => {
	const handleValueChange = (value: string) => {
		onSelect(value as MirrorTone);
		onOpenChange(false);
	};

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<DialogBlurBackdrop />
				<Dialog.Content className="mx-auto max-w-sm">
					<View className="mb-5">
						<Dialog.Title>Mirror tone</Dialog.Title>
						<Dialog.Description>
							Choose how your reflections are worded.
						</Dialog.Description>
					</View>

					<RadioGroup onValueChange={handleValueChange} value={currentTone}>
						{TONE_OPTIONS.map((opt, index) => (
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
								{index < TONE_OPTIONS.length - 1 && <Separator />}
							</View>
						))}
					</RadioGroup>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	);
};
