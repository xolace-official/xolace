import { View } from "react-native";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { useRouter } from "expo-router";
import { SymbolView, SFSymbol } from "expo-symbols";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { AnimatedRow } from "@/src/features/idle-menu/animated-row";
import { GlowIcon } from "@/src/features/idle-menu/glow-icon";
import { playSoftPress } from "@/src/lib/haptics";
import { useAppStore } from "@/src/store/store";

type MenuButtonItem = {
  label: string;
  iconName: { ios: SFSymbol; android: string };
  onPress: () => void;
  accessibilityLabel: string;
  /** Newly added item — icon glows until the item is opened once. */
  newKey?: string;
};

type Props = {
  isOpen: SharedValue<boolean>;
  onClose: () => void;
};

const ICON_DIM_STYLE = { opacity: 0.6 };

export const MenuButtons = ({ isOpen, onClose }: Props) => {
  const router = useRouter();
  const foregroundColor = useThemeColor("foreground");
  const accentColor = useThemeColor("accent");
  const containerHeight = useSharedValue(0);
  const seenMenuItems = useAppStore((s) => s.seenMenuItems);
  const markMenuItemSeen = useAppStore((s) => s.markMenuItemSeen);

  // Primary actions — what you came to do. Full rows.
  const primaryItems: MenuButtonItem[] = [
    {
      label: "Discovery",
      iconName: { ios: "safari", android: "explore" },
      accessibilityLabel: "Open discovery",
      newKey: "discovery",
      onPress: () => {
        onClose();
        // replace, not push — reflect stays the "/" landing with no back stack.
        // Cast until typedRoutes regenerates on next expo start (see /quotes).
        router.replace("/discovery" as any);
      },
    },
    {
      label: "Vent",
      iconName: { ios: "mic", android: "mic" },
      accessibilityLabel: "Open voice vent, speak your weight",
      newKey: "vent",
      onPress: () => {
        onClose();
        router.push("/(protected)/voice-vent");
      },
    },
  ];

  // Housekeeping — shares one compact row.
  const compactItems: MenuButtonItem[] = [
    {
      label: "Settings",
      iconName: { ios: "gearshape", android: "settings" },
      accessibilityLabel: "Open settings",
      onPress: () => {
        onClose();
        router.push("/(protected)/settings");
      },
    },
  ];

  const rowCount = primaryItems.length + 1;

  const isNew = (item: MenuButtonItem) =>
    !!item.newKey && !seenMenuItems.includes(item.newKey);

  const handlePress = (item: MenuButtonItem) => {
    playSoftPress();
    if (item.newKey) markMenuItemSeen(item.newKey);
    item.onPress();
  };

  const renderIcon = (item: MenuButtonItem, size: number) =>
    isNew(item) ? (
      <GlowIcon name={item.iconName} size={size} color={accentColor} />
    ) : (
      <SymbolView
        name={item.iconName as any}
        size={size}
        tintColor={foregroundColor}
        style={ICON_DIM_STYLE}
      />
    );

  const onContainerLayout = (e: {
    nativeEvent: { layout: { height: number } };
  }) => {
    containerHeight.set(e.nativeEvent.layout.height);
  };

  return (
    <View className="gap-1" onLayout={onContainerLayout}>
      {primaryItems.map((item, index) => (
        <AnimatedRow
          key={item.label}
          isOpen={isOpen}
          index={index}
          numberOfRows={rowCount}
          containerHeight={containerHeight}
        >
          <PressableFeedback
            onPress={() => handlePress(item)}
            accessibilityRole="menuitem"
            accessibilityLabel={item.accessibilityLabel}
          >
            <View className="flex-row items-center gap-4 rounded-2xl bg-surface px-6 py-4">
              {renderIcon(item, 22)}
              <AppText className="text-base font-medium text-foreground">
                {item.label}
              </AppText>
            </View>
          </PressableFeedback>
        </AnimatedRow>
      ))}

      <AnimatedRow
        key="compact-row"
        isOpen={isOpen}
        index={primaryItems.length}
        numberOfRows={rowCount}
        containerHeight={containerHeight}
      >
        <View className="flex-row gap-1">
          {compactItems.map((item) => (
            <PressableFeedback
              key={item.label}
              className="flex-1"
              onPress={() => handlePress(item)}
              accessibilityRole="menuitem"
              accessibilityLabel={item.accessibilityLabel}
            >
              <View className="flex-row items-center gap-4 rounded-2xl bg-surface px-6 py-4">
                {renderIcon(item, 20)}
                <AppText
                  className="text-sm font-medium text-foreground"
                  numberOfLines={1}
                >
                  {item.label}
                </AppText>
              </View>
            </PressableFeedback>
          ))}
        </View>
      </AnimatedRow>
    </View>
  );
};
