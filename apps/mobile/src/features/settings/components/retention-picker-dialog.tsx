import { Dialog, RadioGroup, Radio, Separator } from "heroui-native";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";

export type RetentionOption = "indefinite" | "6_months" | "1_year";

type Option = {
  value: RetentionOption;
  label: string;
  description: string;
};

const RETENTION_OPTIONS: Option[] = [
  {
    value: "indefinite",
    label: "Indefinite",
    description: "Keep my data until I delete it",
  },
  {
    value: "1_year",
    label: "1 year",
    description: "Auto-delete sessions older than 1 year",
  },
  {
    value: "6_months",
    label: "6 months",
    description: "Auto-delete sessions older than 6 months",
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
        <Dialog.Content className="max-w-sm mx-auto">
          <View className="mb-5">
            <Dialog.Title>Data retention</Dialog.Title>
            <Dialog.Description>
              Choose how long Xolace keeps your session history.
            </Dialog.Description>
          </View>

          <RadioGroup value={currentValue} onValueChange={handleValueChange}>
            {RETENTION_OPTIONS.map((opt, index) => (
              <View key={opt.value}>
                <RadioGroup.Item value={opt.value} className="py-3">
                  <View className="flex-1 gap-0.5">
                    <AppText className="text-base font-medium text-foreground">
                      {opt.label}
                    </AppText>
                    <AppText className="text-sm text-foreground/50">
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
