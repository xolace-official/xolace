import { Dialog, RadioGroup, Radio, Separator } from "heroui-native";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";
import type { ThemeMode } from "@/src/features/settings/hooks/use-settings";

type ThemeOption = {
  value: ThemeMode;
  label: string;
  description: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "system",
    label: "System",
    description: "Follows your device's appearance setting",
  },
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme",
  },
];

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentMode: ThemeMode;
  onSelect: (mode: ThemeMode) => void;
};

/**
 * Modal dialog for selecting the app theme mode (System / Light / Dark).
 * Preserves the active colour-theme (lavender, mint, etc.) while switching modes.
 */
export const ThemePickerDialog = ({
  isOpen,
  onOpenChange,
  currentMode,
  onSelect,
}: Props) => {
  const handleValueChange = (value: string) => {
    onSelect(value as ThemeMode);
    onOpenChange(false);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <DialogBlurBackdrop />
        <Dialog.Content className="max-w-sm mx-auto">
          <View className="mb-5">
            <Dialog.Title>Theme</Dialog.Title>
            <Dialog.Description>
              Choose how Xolace displays colours.
            </Dialog.Description>
          </View>

          <RadioGroup value={currentMode} onValueChange={handleValueChange}>
            {THEME_OPTIONS.map((opt, index) => (
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
                {index < THEME_OPTIONS.length - 1 && <Separator />}
              </View>
            ))}
          </RadioGroup>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
