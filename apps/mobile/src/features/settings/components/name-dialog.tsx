import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Dialog, TextField, Input, Label, FieldError, Button } from 'heroui-native';
import { DialogBlurBackdrop } from '@/src/components/dialog-blur-backdrop';
import { AppText } from '@/src/components/shared/app-text';

function extractErrorMessage(e: unknown): string {
  if (!(e instanceof Error)) return 'Something went wrong';
  const match = e.message.match(/Uncaught Error: (.+?)(?:\n|$)/);
  return match ? match[1] : e.message;
}

type Validation = { ok: true; trimmed: string } | { ok: false; message: string };

type Props = {
  isOpen: boolean;
  title: string;
  description: string;
  placeholder: string;
  /** Label above the input. Defaults to "Name". */
  fieldLabel?: string;
  validate: (name: string) => Validation;
  currentName?: string;
  autoCapitalize?: 'none' | 'words';
  /** Omit to hide the "Remove name" affordance — i.e. the name is required. */
  onClear?: () => Promise<void>;
  /** Label for the clear affordance. Defaults to "Remove name". */
  clearLabel?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<void>;
};

type FormProps = Omit<Props, 'isOpen'>;

const NameForm = ({
  title,
  description,
  placeholder,
  fieldLabel = 'Name',
  validate,
  currentName,
  autoCapitalize = 'none',
  onClear,
  clearLabel = 'Remove name',
  onOpenChange,
  onSave,
}: FormProps) => {
  const [value, setValue] = useState(currentName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validation = value.trim().length > 0 ? validate(value) : null;
  const clientError = validation && !validation.ok ? validation.message : null;
  const canSave = value.trim().length > 0 && !clientError;
  const displayError = clientError ?? error;

  const handleSave = async () => {
    if (!canSave) return;
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
    if (!onClear) return;
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

      <TextField isInvalid={!!displayError} className="mb-5">
        <Label>{fieldLabel}</Label>
        <Input
          value={value}
          onChangeText={(t) => { setValue(t); setError(null); }}
          placeholder={placeholder}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
        {displayError ? <FieldError>{displayError}</FieldError> : null}
      </TextField>

      <View className="flex-row items-center">
        {onClear && currentName ? (
          <Pressable onPress={handleClear} disabled={isSaving} hitSlop={8}>
            <AppText className="text-sm text-foreground/40">
              {clearLabel}
            </AppText>
          </Pressable>
        ) : null}
        <View className="flex-1" />
        <View className="flex-row gap-3">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onOpenChange(false)}
            isDisabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onPress={handleSave}
            isDisabled={!canSave || isSaving}
          >
            Save
          </Button>
        </View>
      </View>
    </Dialog.Content>
  );
};

export const NameDialog = ({ isOpen, ...formProps }: Props) => {
  return (
    <Dialog isOpen={isOpen} onOpenChange={formProps.onOpenChange}>
      <Dialog.Portal>
        <DialogBlurBackdrop />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {isOpen && <NameForm {...formProps} />}
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  );
};
