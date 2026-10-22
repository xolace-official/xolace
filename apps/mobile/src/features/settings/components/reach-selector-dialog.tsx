import { Dialog, RadioGroup, Radio, Separator } from "heroui-native";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";

export type NotificationReach = "warm" | "direct" | "quiet";

type ReachOption = {
  value: NotificationReach;
  label: string;
  description: string;
};

const REACH_OPTIONS: ReachOption[] = [
  {
    value: "warm",
    label: "Warm",
    description: "Gentle recognition - a friend who notices without demanding",
  },
  {
    value: "direct",
    label: "Direct",
    description: "Honest and pattern-aware - gets to the point",
  },
  {
    value: "quiet",
    label: "Quiet",
    description: "Minimal presence - often just a word or two",
  },
];

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentReach: NotificationReach;
  onSelect: (reach: NotificationReach) => void;
};

export const ReachSelectorDialog = ({
  isOpen,
  onOpenChange,
  currentReach,
  onSelect,
}: Props) => {
  const handleValueChange = (value: string) => {
    onSelect(value as NotificationReach);
    onOpenChange(false);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <DialogBlurBackdrop />
        <Dialog.Content className="max-w-sm">
          <View className="mb-5">
            <Dialog.Title>How I reach out</Dialog.Title>
            <Dialog.Description>
              The tone of your reminders.
            </Dialog.Description>
          </View>

          <RadioGroup value={currentReach} onValueChange={handleValueChange}>
            {REACH_OPTIONS.map((opt, index) => (
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
                {index < REACH_OPTIONS.length - 1 && <Separator />}
              </View>
            ))}
          </RadioGroup>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
