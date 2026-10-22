import { useEffect } from "react";
import { Dimensions, ScrollView, View } from "react-native";
import { useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import Animated, { FadeInDown } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";
import { AppText } from "@/src/components/shared/app-text";
import { useAppStore } from "@/src/store/store";
import { WHATS_NEW, LATEST_WHATS_NEW_ID } from "../constants/whats-new";

const LIST_MAX_HEIGHT = Dimensions.get("window").height * 0.5;

/**
 * Read-only changelog. Opening it marks the newest entry as seen (clears the
 * menu badge) and records the structural open event — no content captured.
 */
export const WhatsNew = () => {
  const setLastSeenVersion = useAppStore((s) => s.setLastSeenVersion);
  const posthog = usePostHog();
  const accentColor = useThemeColor("accent") as string;

  // Marking-as-seen + analytics is a genuine side effect on open, not state
  // mirroring — an effect is the right tool here.
  useEffect(() => {
    posthog.capture("whats_new_opened");
    if (LATEST_WHATS_NEW_ID) setLastSeenVersion(LATEST_WHATS_NEW_ID);
  }, [posthog, setLastSeenVersion]);

  return (
    <View className="gap-3">
      <AppText className="text-lg font-semibold text-foreground">
        What&apos;s new
      </AppText>

      <ScrollView
        style={{ maxHeight: LIST_MAX_HEIGHT }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View className="gap-5">
          {WHATS_NEW.map((entry, index) => (
            <Animated.View
              key={entry.id}
              entering={FadeInDown.delay(index * 50)}
              className="gap-2.5"
            >
              <View className="flex-row items-center justify-between">
                <AppText className="text-sm font-medium text-foreground">
                  {entry.label}
                </AppText>
                <AppText className="text-xs text-foreground/40">
                  {entry.date}
                </AppText>
              </View>

              {entry.highlights.map((highlight) => (
                <View key={highlight.title} className="flex-row gap-3">
                  <SymbolView
                    name={highlight.icon}
                    size={18}
                    tintColor={accentColor}
                  />
                  <View className="flex-1">
                    <AppText className="text-sm text-foreground">
                      {highlight.title}
                    </AppText>
                    <AppText className="text-xs font-light text-foreground/50">
                      {highlight.body}
                    </AppText>
                  </View>
                </View>
              ))}
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
