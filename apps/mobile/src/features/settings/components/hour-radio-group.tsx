import { View } from "react-native";
import { RadioGroup, Radio } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";

type Props = {
  label: string;
  value: number;
  options: { label: string; value: number }[];
  onChange: (hour: number) => void;
  className?: string;
};

/**
 * A labelled list of hours to pick one from — the "not before" / "not after"
 * halves of the quiet window, which are the same control twice.
 */
export const HourRadioGroup = ({
  label,
  value,
  options,
  onChange,
  className,
}: Props) => (
  <>
    <View className="px-5 pt-5 pb-1">
      <AppText className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">
        {label}
      </AppText>
    </View>
    <View className={cn("px-5", className)}>
      <RadioGroup
        value={String(value)}
        onValueChange={(v) => onChange(Number(v))}
        className="gap-1.5"
      >
        {options.map((opt) => (
          <RadioGroup.Item key={opt.value} value={String(opt.value)}>
            {({ isSelected }) => (
              <View
                className={cn(
                  "flex-row items-center gap-4 px-4 py-3 rounded-xl",
                  isSelected ? "bg-surface" : "bg-surface/30",
                )}
              >
                <Radio />
                <AppText className="flex-1 text-base text-foreground">
                  {opt.label}
                </AppText>
              </View>
            )}
          </RadioGroup.Item>
        ))}
      </RadioGroup>
    </View>
  </>
);
