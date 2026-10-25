import {
	SPACE_NAME_MAX_LENGTH,
	validateSpaceName,
} from "@xolace/backend/convex/lib/spaceName";
import {
	Button,
	Dialog,
	FieldError,
	Input,
	Label,
	TextField,
} from "heroui-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";

function extractErrorMessage(e: unknown): string {
	if (!(e instanceof Error)) {
		return "Something went wrong";
	}
	const match = e.message.match(/Uncaught Error: (.+?)(?:\n|$)/);
	return match ? match[1] : e.message;
}

function clientValidate(name: string): string | null {
	if (!name.trim()) {
		return null;
	}
	const result = validateSpaceName(name);
	return result.ok ? null : result.message;
}

type Props = {
	isOpen: boolean;
	onSave: (name: string) => Promise<void>;
	onDismiss: () => Promise<void>;
};

export const SpaceNamePromptDialog = ({ isOpen, onSave, onDismiss }: Props) => {
	const [value, setValue] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const clientError = value.trim().length > 0 ? clientValidate(value) : null;
	const canSave = value.trim().length > 0 && !clientError;
	const displayError = clientError ?? error;

	const handleSave = async () => {
		if (!canSave) {
			return;
		}
		setIsSaving(true);
		try {
			await onSave(value.trim());
			setValue("");
			setError(null);
		} catch (e) {
			setError(extractErrorMessage(e));
		} finally {
			setIsSaving(false);
		}
	};

	const handleDismiss = async () => {
		setValue("");
		setError(null);
		try {
			await onDismiss();
		} catch (e) {
			setError(extractErrorMessage(e));
		}
	};

	return (
		<Dialog
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					void handleDismiss();
				}
			}}
		>
			<Dialog.Portal>
				<DialogBlurBackdrop />
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					<Dialog.Content className="mx-auto w-full max-w-sm">
						<View className="mb-4 gap-1">
							<Dialog.Title>
								Want to give this space a name? It&apos;s yours.
							</Dialog.Title>
							<Dialog.Description>
								A soft label, just for you. You can change it anytime in
								settings.
							</Dialog.Description>
						</View>

						<TextField className="mb-5" isInvalid={!!displayError}>
							<Label>Name</Label>
							<Input
								autoCapitalize="none"
								autoCorrect={false}
								maxLength={SPACE_NAME_MAX_LENGTH + 2}
								onChangeText={(t) => {
									setValue(t);
									setError(null);
								}}
								onSubmitEditing={handleSave}
								placeholder="e.g. ember, haven, mine"
								returnKeyType="done"
								value={value}
							/>
							{displayError ? <FieldError>{displayError}</FieldError> : null}
						</TextField>

						<View className="flex-row justify-end gap-3">
							<Button
								isDisabled={isSaving}
								onPress={handleDismiss}
								size="sm"
								variant="ghost"
							>
								Not now
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
					</Dialog.Content>
				</KeyboardAvoidingView>
			</Dialog.Portal>
		</Dialog>
	);
};
