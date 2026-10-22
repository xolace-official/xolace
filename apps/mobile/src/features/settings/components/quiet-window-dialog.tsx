import { useState } from "react";
import { Dialog, RadioGroup, Radio, Separator, Button } from "heroui-native";
import { View, ScrollView, StyleSheet } from "react-native";
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
    onSave({ dontReachBefore: beforeHour, dontReachAfter: afterHour });
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

          <AppText className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-2">
            Not before
          </AppText>
          <ScrollView
            style={styles.hoursList}
            showsVerticalScrollIndicator={false}
          >
            <RadioGroup
              value={String(beforeHour)}
              onValueChange={(v) => setBeforeHour(Number(v))}
            >
              {BEFORE_OPTIONS.map((opt, index) => (
                <View key={opt.value}>
                  <RadioGroup.Item value={String(opt.value)} className="py-2.5">
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

          <AppText className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mt-5 mb-2">
            Not after
          </AppText>
          <ScrollView
            style={styles.hoursList}
            showsVerticalScrollIndicator={false}
          >
            <RadioGroup
              value={String(afterHour)}
              onValueChange={(v) => setAfterHour(Number(v))}
            >
              {AFTER_OPTIONS.map((opt, index) => (
                <View key={opt.value}>
                  <RadioGroup.Item value={String(opt.value)} className="py-2.5">
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

          <View className="flex-row gap-3 mt-6">
            {current && (
              <Button variant="ghost" onPress={handleClear} className="flex-1">
                Clear
              </Button>
            )}
            <Button variant="primary" onPress={handleSave} className="flex-1">
              Save
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
