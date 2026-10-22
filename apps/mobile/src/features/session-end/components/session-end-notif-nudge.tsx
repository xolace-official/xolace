import { useState, useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { EaseView } from "react-native-ease/uniwind";
import * as Notifications from "expo-notifications";
import { PressableFeedback } from "heroui-native";
import { useMutation } from "convex/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import { requestPushToken } from "@/src/lib/push-token";
import { useAppStore } from "@/src/store/store";
import { Presets } from "react-native-pulsar";

const NUDGE_EASING: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const NUDGE_TRANSITION = {
  type: "timing" as const,
  duration: 440,
  easing: NUDGE_EASING,
};
const FLUX_IMAGE_STYLE = { width: 220, height: 220 } as const;

export function SessionEndNotifNudge() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const notifNudgeDismissed = useAppStore((s) => s.notifNudgeDismissed);
  const setNotifNudgeDismissed = useAppStore((s) => s.setNotifNudgeDismissed);
  const registerToken = useMutation(api.notifications.registerToken);

  useEffect(() => {
    if (notifNudgeDismissed) return;

    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | undefined;

    Notifications.getPermissionsAsync().then(({ status }) => {
      if (cancelled) return;
      if (status === "undetermined") {
        setMounted(true);
        t = setTimeout(() => setShow(true), 900);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [notifNudgeDismissed]);

  const dismiss = () => {
    setNotifNudgeDismissed(true);
    setShow(false);
  };

  const handleRemindMe = async () => {
    Presets.bloom();
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        const token = await requestPushToken();
        if (token) {
          await registerToken({ pushToken: token });
        }
      }
    } catch {
      // Non-blocking — permission UX is best-effort
    }
    dismiss();
  };

  const handleLater = () => {
    Presets.flick();
    dismiss();
  };

  const nudgeAnimate = { opacity: show ? 1 : 0, translateY: show ? 0 : height };
  const containerInsetStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom + 8,
  };

  if (!mounted) return null;

  return (
    <EaseView
      animate={nudgeAnimate}
      transition={NUDGE_TRANSITION}
      onTransitionEnd={({ finished }) => {
        if (finished && !show) setMounted(false);
      }}
      className="absolute inset-0 bg-background"
      style={containerInsetStyle}
    >
      <View className="flex-1 px-6 justify-between">
        {/* Top spacer */}
        <View />

        {/* Mascot + copy */}
        <View className="items-center gap-8">
          <Image
            source={require("@/assets/images/flux/flux-look-mini-bg.png")}
            style={FLUX_IMAGE_STYLE}
            contentFit="contain"
          />
          <View className="items-center gap-3">
            <AppText className="text-3xl font-semibold text-foreground text-center leading-10">
              Want Flux to{"\n"}check in?
            </AppText>
            <AppText className="text-base text-foreground/50 text-center leading-6">
              A quiet reminder to come back{"\n"}when you need it.
            </AppText>
          </View>
        </View>

        {/* Buttons */}
        <View className="gap-3">
          <PressableFeedback
            onPress={handleRemindMe}
            className="items-center rounded-full bg-accent/10 border border-accent/30 py-4"
            accessibilityLabel="Enable reminders"
          >
            <AppText className="text-base font-semibold text-accent">
              Remind me
            </AppText>
          </PressableFeedback>
          <PressableFeedback
            onPress={handleLater}
            className="items-center rounded-full border border-border py-4"
            accessibilityLabel="Dismiss reminder prompt"
          >
            <AppText className="text-base font-light text-foreground/30">
              Maybe later
            </AppText>
          </PressableFeedback>
        </View>
      </View>
    </EaseView>
  );
}
