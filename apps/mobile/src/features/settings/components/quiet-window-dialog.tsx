import { Button, Dialog, Radio, RadioGroup, Separator } from "heroui-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";

const BEFORE_OPTIONS = [
	{ label: "5 am", value: 5 },
	{ label: "6 am", value: 6 },
	{ label: "7 am", value: 7 },
	{ label: "8 am", value: 8 },
	{ label: "9 am", value: 9 },
	{ label: "10 am", value: 10 },
];

const AFTER_OPTIONS = [
	{ label: "7 pm", value: 19 },
	{ label: "8 pm", value: 20 },
	{ label: "9 pm", value: 21 },
	{ label: "10 pm", value: 22 },
	{ label: "11 pm", value: 23 },
];

type QuietWindow = { dontReachBefore: number; dontReachAfter: number };

const styles = StyleSheet.create({
	hoursList: { maxHeight: 180 },
});

type Props = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	current: QuietWindow | null;
	onSave: (window: QuietWindow | null) => void;
};

export const QuietWindowDialog = ({
	isOpen,
	onOpenChange,
	current,
	onSave,
}: Props) => {
	const [beforeHour, setBeforeHour] = useState(current?.dontReachBefore ?? 8);
	const [afterHour, setAfterHour] = useState(current?.dontReachAfter ?? 21);

	// Dialog stays mounted across open/close. Reset to the persisted value each
	// time it opens so stale picks don't leak between sessions.
	const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
	if (prevIsOpen !== isOpen) {
		setPrevIsOpen(isOpen);
		if (isOpen) {
			setBeforeHour(current?.dontReachBefore ?? 8);
			setAfterHour(current?.dontReachAfter ?? 21);
		}
	}

	const handleSave = () => {
		onSave({ dontReachAfter: afterHour, dontReachBefore: beforeHour });
		onOpenChange(false);
	};

	const handleClear = () => {
		onSave(null);
		onOpenChange(false);
	};

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<DialogBlurBackdrop />
				<Dialog.Content className="max-w-sm">
					<View className="mb-5">
						<Dialog.Title>Quiet hours</Dialog.Title>
						<Dialog.Description>
							Only reach you between these hours.
						</Dialog.Description>
					</View>

					<AppText className="mb-2 font-semibold text-foreground/60 text-sm uppercase tracking-wider">
						Not before
					</AppText>
					<ScrollView
						showsVerticalScrollIndicator={false}
						style={styles.hoursList}
					>
						<RadioGroup
							onValueChange={(v) => setBeforeHour(Number(v))}
							value={String(beforeHour)}
						>
							{BEFORE_OPTIONS.map((opt, index) => (
								<View key={opt.value}>
									<RadioGroup.Item className="py-2.5" value={String(opt.value)}>
										<AppText className="flex-1 text-base text-foreground">
											{opt.label}
										</AppText>
										<Radio />
									</RadioGroup.Item>
									{index < BEFORE_OPTIONS.length - 1 && <Separator />}
								</View>
							))}
						</RadioGroup>
					</ScrollView>

					<AppText className="mt-5 mb-2 font-semibold text-foreground/60 text-sm uppercase tracking-wider">
						Not after
					</AppText>
					<ScrollView
						showsVerticalScrollIndicator={false}
						style={styles.hoursList}
					>
						<RadioGroup
							onValueChange={(v) => setAfterHour(Number(v))}
							value={String(afterHour)}
						>
							{AFTER_OPTIONS.map((opt, index) => (
								<View key={opt.value}>
									<RadioGroup.Item className="py-2.5" value={String(opt.value)}>
										<AppText className="flex-1 text-base text-foreground">
											{opt.label}
										</AppText>
										<Radio />
									</RadioGroup.Item>
									{index < AFTER_OPTIONS.length - 1 && <Separator />}
								</View>
							))}
						</RadioGroup>
					</ScrollView>

					<View className="mt-6 flex-row gap-3">
						{current && (
							<Button className="flex-1" onPress={handleClear} variant="ghost">
								Clear
							</Button>
						)}
						<Button className="flex-1" onPress={handleSave} variant="primary">
							Save
						</Button>
					</View>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	);
};
