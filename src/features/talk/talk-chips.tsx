// A row of choices as pills (#603): the talk's voice, pace and directness.
import { View } from "react-native";
import { PressableFeedback } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";

export type Chip<T extends string> = { value: T; label: string; accessory?: React.ReactNode; hint?: string };

export function TalkChips<T extends string>({
  options,
  value,
  onPress,
}: {
  options: Chip<T>[];
  value: T;
  onPress: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableFeedback
            key={o.value}
            onPress={() => onPress(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            accessibilityHint={o.hint}
            className={cn(
              "min-h-9 flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5",
              on ? "border-accent bg-accent/10" : "border-border/60",
            )}
          >
            {o.accessory}
            <AppText className={cn("text-sm", on ? "font-medium text-foreground" : "text-foreground/70")}>{o.label}</AppText>
          </PressableFeedback>
        );
      })}
    </View>
  );
}
