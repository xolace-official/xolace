import { Dialog, RadioGroup, Radio, Separator } from "heroui-native";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";

export type MirrorTone = "adaptive" | "poetic" | "gentle" | "direct" | "witnessed";

type ToneOption = {
  value: MirrorTone;
  label: string;
  description: string;
};

const TONE_OPTIONS: ToneOption[] = [
  {
    value: "adaptive",
    label: "Adaptive",
    description: "Reads your writing style and mirrors it back",
  },
  {
    value: "poetic",
    label: "Poetic",
    description: "Evocative, metaphor-rich language",
  },
  {
    value: "gentle",
    label: "Gentle",
    description: "Warm, simple language",
  },
  {
    value: "direct",
    label: "Direct",
    description: "Clear and minimal, no metaphors",
  },
  {
    value: "witnessed",
    label: "Witnessed",
    description: "Begins with a moment of recognition, then mirrors",
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
        <Dialog.Content className="max-w-sm mx-auto">
          <View className="mb-5">
            <Dialog.Title>Mirror tone</Dialog.Title>
            <Dialog.Description>
              Choose how your reflections are worded.
            </Dialog.Description>
          </View>

          <RadioGroup value={currentTone} onValueChange={handleValueChange}>
            {TONE_OPTIONS.map((opt, index) => (
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
                {index < TONE_OPTIONS.length - 1 && <Separator />}
              </View>
            ))}
          </RadioGroup>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
