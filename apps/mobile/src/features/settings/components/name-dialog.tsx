import {
	Button,
	Dialog,
	FieldError,
	Input,
	Label,
	TextField,
} from "heroui-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { DialogBlurBackdrop } from "@/components/dialog-blur-backdrop";
import { AppText } from "@/components/shared/app-text";

function extractErrorMessage(e: unknown): string {
	if (!(e instanceof Error)) {
		return "Something went wrong";
	}
	const match = e.message.match(/Uncaught Error: (.+?)(?:\n|$)/);
	return match ? match[1] : e.message;
}

type Validation =
	| { ok: true; trimmed: string }
	| { ok: false; message: string };

type Props = {
	isOpen: boolean;
	title: string;
	description: string;
	placeholder: string;
	/** Label above the input. Defaults to "Name". */
	fieldLabel?: string;
	validate: (name: string) => Validation;
	currentName?: string;
	autoCapitalize?: "none" | "words";
	/** Omit to hide the "Remove name" affordance, making the name required. */
	onClear?: () => Promise<void>;
	/** Label for the clear affordance. Defaults to "Remove name". */
	clearLabel?: string;
	onOpenChange: (open: boolean) => void;
	onSave: (name: string) => Promise<void>;
};

type FormProps = Omit<Props, "isOpen">;

const NameForm = ({
	title,
	description,
	placeholder,
	fieldLabel = "Name",
	validate,
	currentName,
	autoCapitalize = "none",
	onClear,
	clearLabel = "Remove name",
	onOpenChange,
	onSave,
}: FormProps) => {
	const [value, setValue] = useState(currentName ?? "");
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const validation = value.trim().length > 0 ? validate(value) : null;
	const clientError = validation && !validation.ok ? validation.message : null;
	const canSave = value.trim().length > 0 && !clientError;
	const displayError = clientError ?? error;

	const handleSave = async () => {
		if (!canSave) {
			return;
		}
		setIsSaving(true);
		try {
			await onSave(value.trim());
			onOpenChange(false);
		} catch (e) {
			setError(extractErrorMessage(e));
		} finally {
			setIsSaving(false);
		}
	};

	const handleClear = async () => {
		if (!onClear) {
			return;
		}
		setIsSaving(true);
		try {
			await onClear();
			onOpenChange(false);
		} catch (e) {
			setError(extractErrorMessage(e));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog.Content className="mx-auto w-full max-w-sm">
			<View className="mb-4 gap-1">
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.Description>{description}</Dialog.Description>
			</View>

			<TextField className="mb-5" isInvalid={!!displayError}>
				<Label>{fieldLabel}</Label>
				<Input
					autoCapitalize={autoCapitalize}
					autoCorrect={false}
					onChangeText={(t) => {
						setValue(t);
						setError(null);
					}}
					onSubmitEditing={handleSave}
					placeholder={placeholder}
					returnKeyType="done"
					value={value}
				/>
				{displayError ? <FieldError>{displayError}</FieldError> : null}
			</TextField>

			<View className="flex-row items-center">
				{onClear && currentName ? (
					<Pressable disabled={isSaving} hitSlop={8} onPress={handleClear}>
						<AppText className="text-foreground/40 text-sm">
							{clearLabel}
						</AppText>
					</Pressable>
				) : null}
				<View className="flex-1" />
				<View className="flex-row gap-3">
					<Button
						isDisabled={isSaving}
						onPress={() => onOpenChange(false)}
						size="sm"
						variant="ghost"
					>
						Cancel
					</Button>
					<Button
						isDisabled={!canSave || isSaving}
						onPress={handleSave}
						size="sm"
						variant="primary"
					>
						Save
					</Button>
				</View>
			</View>
		</Dialog.Content>
	);
};

export const NameDialog = ({ isOpen, ...formProps }: Props) => (
	<Dialog isOpen={isOpen} onOpenChange={formProps.onOpenChange}>
		<Dialog.Portal>
			<DialogBlurBackdrop />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				{isOpen && <NameForm {...formProps} />}
			</KeyboardAvoidingView>
		</Dialog.Portal>
	</Dialog>
);
