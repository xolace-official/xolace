import { Pressable } from "react-native";
import { Popover } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { AppText } from "@/src/components/shared/app-text";
import { useTokenColor } from "../hooks/use-token-color";

type Props = {
  title: string;
  description: string;
};

/**
 * Small info affordance beside a card title. Tapping the icon opens a popover
 * explaining what the card shows. The trigger is its own Pressable so it claims
 * the touch and never fires the surrounding card's press handler.
 */
export function CardInfo({ title, description }: Props) {
  const muted = useTokenColor("muted");

  return (
    <Popover>
      <Popover.Trigger asChild>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`About ${title}`}
        >
          <SymbolView name={{ ios: "info.circle", android: "info", web: "info" }} size={13} tintColor={muted + "AA"} />
        </Pressable>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Overlay />
        <Popover.Content
          presentation="popover"
          width={284}
          placement="bottom"
          align="start"
          className="rounded-2xl border border-border bg-surface px-5 py-4"
        >
          <AppText className="text-foreground text-sm font-medium mb-1.5">{title}</AppText>
          <AppText className="text-foreground/55 text-[12px] leading-5">{description}</AppText>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  );
}
