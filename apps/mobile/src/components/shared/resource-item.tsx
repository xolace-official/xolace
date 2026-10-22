import { Linking, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { PressableFeedback, useToast } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";
import type { Resource } from "@/src/features/crisis-resources/types";

type Props = {
  resource: Resource;
  index: number;
  onTap?: (resource: Resource) => void;
};

async function openResourceUrl(
  resource: Resource,
  showToast: (msg: string) => void,
) {
  let url: string;
  if (resource.type === "phone") {
    url = `tel:${resource.value}`;
  } else if (resource.type === "url") {
    url = resource.value;
  } else if (resource.type === "email") {
    url = `mailto:${resource.value}`;
  } else {
    return;
  }

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    if (resource.type === "phone")
      showToast("Phone calls not supported on this device");
    else if (resource.type === "email") showToast("No mail app found");
    return;
  }
  await Linking.openURL(url).catch(() => {
    if (resource.type === "phone")
      showToast("Unable to open dialer. Please dial manually.");
    else if (resource.type === "email") showToast("Unable to open mail app.");
    else showToast("Unable to open link.");
  });
}

const EASE_INITIAL_ANIMATE = { opacity: 0, translateY: 20 };
const EASE_ANIMATE = { opacity: 1, translateY: 0 };
const EASE_EASING: [number, number, number, number] = [
  0.455, 0.03, 0.515, 0.955,
];

export function ResourceItem({ resource, index, onTap }: Props) {
  const { toast } = useToast();
  const delay = 400 + index * 150;

  const isTappable =
    resource.type === "phone" ||
    resource.type === "url" ||
    resource.type === "email";
  const isXolace = resource.source === "xolace_support";

  const accessibilityLabel =
    resource.type === "phone" || resource.type === "email"
      ? `${resource.label}, ${resource.value}`
      : resource.label;

  const transition = {
    type: "timing" as const,
    duration: 500,
    delay,
    easing: EASE_EASING,
  };

  const handlePress = async () => {
    playSoftPress();
    onTap?.(resource);
    await openResourceUrl(resource, (msg) =>
      toast.show({ label: msg, variant: "default" }),
    );
  };

  const inner = (
    <View
      className={`rounded-xl border px-4 py-3.5 ${isXolace ? "border-accent/30 bg-accent/10" : "border-foreground/10 bg-surface"}`}
    >
      <View className="flex-row items-center justify-between">
        <AppText
          className={`flex-1 text-sm ${isXolace ? "text-accent" : "text-foreground"}`}
        >
          {resource.label}
        </AppText>
        {isTappable && (
          <AppText
            className={`ml-3 text-xs ${isXolace ? "text-accent/70" : "text-accent"}`}
          >
            {resource.type === "phone"
              ? resource.value
              : resource.type === "email"
                ? resource.value
                : "Open →"}
          </AppText>
        )}
      </View>
      {resource.description && (
        <AppText className="mt-0.5 text-xs font-light text-foreground/40">
          {resource.description}
        </AppText>
      )}
      {resource.type === "text" && (
        <AppText className="mt-1 text-xs font-light text-foreground/65">
          {resource.value}
        </AppText>
      )}
    </View>
  );

  return (
    <EaseView
      initialAnimate={EASE_INITIAL_ANIMATE}
      animate={EASE_ANIMATE}
      transition={transition}
    >
      {isTappable ? (
        <PressableFeedback
          onPress={handlePress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          {inner}
        </PressableFeedback>
      ) : (
        <View
          accessibilityRole="text"
          accessibilityLabel={`${resource.label}: ${resource.value}`}
        >
          {inner}
        </View>
      )}
    </EaseView>
  );
}
