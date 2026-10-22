import { View } from "react-native";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { useAppStore } from "@/src/store/store";
import { useTray } from "../engine/tray-provider";
import { hasUnseenWhatsNew } from "../constants/whats-new";
import type { Trays } from "./registry";

type CrossPlatformSymbol = React.ComponentProps<typeof SymbolView>["name"];

type Row = {
  key: "bug" | "idea";
  label: string;
  hint: string;
  icon: CrossPlatformSymbol;
};

const ROWS: Row[] = [
  {
    key: "bug",
    label: "Report a bug",
    hint: "Something broke or felt off",
    icon: { ios: "ant.fill", android: "bug_report" },
  },
  {
    key: "idea",
    label: "Suggest an idea",
    hint: "Something you'd love to see",
    icon: { ios: "lightbulb.fill", android: "lightbulb" },
  },
];

/**
 * Tray root: report a bug, suggest an idea, or see what's new. Each row pushes
 * the matching screen.
 */
export const TrayMenu = () => {
  const { show } = useTray<Trays>();
  const accentColor = useThemeColor("accent") as string;
  const mutedColor = useThemeColor("muted") as string;
  const lastSeenVersion = useAppStore((s) => s.lastSeenVersion);
  const showWhatsNewBadge = hasUnseenWhatsNew(lastSeenVersion);

  return (
    <View className="gap-1">
      <AppText className="text-lg font-semibold text-foreground mb-1">
        How can we help?
      </AppText>

      {ROWS.map((row, index) => (
        <Animated.View key={row.key} entering={FadeInDown.delay(index * 60)}>
          <PressableFeedback
            onPress={() => show("report", { kind: row.key })}
            accessibilityLabel={row.label}
            className="flex-row items-center gap-3 rounded-2xl bg-foreground/5 px-4 py-3.5"
          >
            <SymbolView name={row.icon} size={20} tintColor={accentColor} />
            <View className="flex-1">
              <AppText className="text-base text-foreground">
                {row.label}
              </AppText>
              <AppText className="text-xs font-light text-foreground/50">
                {row.hint}
              </AppText>
            </View>
            <SymbolView
              name={{ ios: "chevron.right", android: "chevron_right" }}
              size={14}
              tintColor={mutedColor}
            />
          </PressableFeedback>
        </Animated.View>
      ))}

      <Animated.View entering={FadeInDown.delay(ROWS.length * 60)}>
        <PressableFeedback
          onPress={() => show("whatsNew")}
          accessibilityLabel="What's new"
          className="flex-row items-center gap-3 rounded-2xl bg-foreground/5 px-4 py-3.5"
        >
          <SymbolView
            name={{ ios: "sparkles", android: "auto_awesome" }}
            size={20}
            tintColor={accentColor}
          />
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <AppText className="text-base text-foreground">
                What&apos;s new
              </AppText>
              {showWhatsNewBadge && (
                <View className="h-2 w-2 rounded-full bg-accent" />
              )}
            </View>
            <AppText className="text-xs font-light text-foreground/50">
              See the latest updates
            </AppText>
          </View>
          <SymbolView
            name={{ ios: "chevron.right", android: "chevron_right" }}
            size={14}
            tintColor={mutedColor}
          />
        </PressableFeedback>
      </Animated.View>
    </View>
  );
};
